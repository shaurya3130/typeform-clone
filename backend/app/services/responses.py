"""Business logic for submissions, results, summary stats and CSV export."""
import csv
import io
from collections import Counter
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..models import CHOICE_TYPES, Answer, Form, Response
from .validation import is_empty, validate_answer


def submit_response(db: Session, form: Form, raw: dict[int, Any]) -> Response:
    errors: dict[int, str] = {}
    answers: list[Answer] = []
    for q in form.questions:
        value = raw.get(q.id)
        err = validate_answer(q, value)
        if err:
            errors[q.id] = err
            continue
        if is_empty(value):
            continue
        a = Answer(question_id=q.id, question_title=q.title)
        if q.type in CHOICE_TYPES:
            choice = next(c for c in q.choices if c.id == int(value))
            a.choice_id, a.value_text = choice.id, choice.label
        elif q.type in ("number", "rating"):
            a.value_number = float(value)
        else:
            a.value_text = str(value).strip() if q.type != "long_text" else str(value)
        answers.append(a)

    if errors:
        raise HTTPException(
            status_code=422,
            detail={"message": "Some answers are invalid", "errors": {str(k): v for k, v in errors.items()}},
        )

    resp = Response(form_id=form.id, answers=answers)
    db.add(resp)
    db.commit()
    db.refresh(resp)
    return resp


def display_value(a: Answer) -> Any:
    if a.value_number is not None:
        n = a.value_number
        return int(n) if n.is_integer() else n
    return a.value_text


def serialize_response(r: Response) -> dict:
    return {
        "id": r.id,
        "submitted_at": r.submitted_at,
        "answers": [
            {"question_id": a.question_id, "question_title": a.question_title, "value": display_value(a)}
            for a in r.answers
        ],
    }


def list_responses(db: Session, form_id: int) -> list[Response]:
    return list(
        db.scalars(
            select(Response)
            .where(Response.form_id == form_id)
            .options(selectinload(Response.answers))
            .order_by(Response.submitted_at.desc())
        )
    )


def get_response_or_404(db: Session, form_id: int, response_id: int) -> Response:
    r = db.scalar(
        select(Response)
        .where(Response.id == response_id, Response.form_id == form_id)
        .options(selectinload(Response.answers))
    )
    if not r:
        raise HTTPException(status_code=404, detail="Response not found")
    return r


def summarize(db: Session, form: Form) -> dict:
    responses = list_responses(db, form.id)
    by_question: dict[int, list[Answer]] = {}
    for r in responses:
        for a in r.answers:
            if a.question_id is not None:
                by_question.setdefault(a.question_id, []).append(a)

    questions = []
    for q in form.questions:
        answers = by_question.get(q.id, [])
        item: dict[str, Any] = {
            "question_id": q.id,
            "title": q.title,
            "type": q.type,
            "answered": len(answers),
            "skipped": len(responses) - len(answers),
        }
        if q.type in CHOICE_TYPES:
            counts = Counter(a.choice_id for a in answers)
            item["options"] = [{"label": c.label, "count": counts.get(c.id, 0)} for c in q.choices]
        elif q.type == "yes_no":
            counts = Counter(a.value_text for a in answers)
            item["options"] = [
                {"label": "Yes", "count": counts.get("yes", 0)},
                {"label": "No", "count": counts.get("no", 0)},
            ]
        elif q.type == "rating":
            scale = int((q.settings or {}).get("scale", 5))
            counts = Counter(int(a.value_number) for a in answers if a.value_number is not None)
            item["options"] = [{"label": str(i), "count": counts.get(i, 0)} for i in range(1, scale + 1)]
            nums = [a.value_number for a in answers if a.value_number is not None]
            item["average"] = round(sum(nums) / len(nums), 2) if nums else None
        elif q.type == "number":
            nums = [a.value_number for a in answers if a.value_number is not None]
            item["average"] = round(sum(nums) / len(nums), 2) if nums else None
            item["min"] = min(nums) if nums else None
            item["max"] = max(nums) if nums else None
        else:
            item["latest"] = [a.value_text for a in answers[:5]]
        questions.append(item)

    views = max(form.view_count, len(responses))
    return {
        "response_count": len(responses),
        "views": views,
        "completion_rate": round(len(responses) / views * 100, 1) if views else None,
        "questions": questions,
    }


def export_csv(db: Session, form: Form) -> str:
    responses = list_responses(db, form.id)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Response ID", "Submitted at", *[q.title or f"Question {q.position + 1}" for q in form.questions]])
    for r in responses:
        by_q = {a.question_id: display_value(a) for a in r.answers}
        writer.writerow(
            [r.id, r.submitted_at.isoformat(), *[by_q.get(q.id, "") for q in form.questions]]
        )
    return buf.getvalue()
