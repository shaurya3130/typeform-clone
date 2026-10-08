"""Business logic for forms and questions (kept out of the routers)."""
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..models import CHOICE_TYPES, Choice, Form, Question, Response
from ..schemas import ChoiceIn, QuestionCreate, QuestionUpdate

DEFAULT_SETTINGS = {
    "rating": {"scale": 5},
    "number": {"min": None, "max": None},
}
DEFAULT_CHOICES = ["Choice A", "Choice B"]


def get_form_or_404(db: Session, form_id: int) -> Form:
    form = db.scalar(
        select(Form)
        .where(Form.id == form_id)
        .options(selectinload(Form.questions).selectinload(Question.choices))
    )
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


def get_question_or_404(db: Session, form_id: int, question_id: int) -> Question:
    q = db.get(Question, question_id)
    if not q or q.form_id != form_id:
        raise HTTPException(status_code=404, detail="Question not found")
    return q


def list_forms(db: Session) -> list[dict]:
    q_count = (
        select(Question.form_id, func.count(Question.id).label("n"))
        .group_by(Question.form_id)
        .subquery()
    )
    r_count = (
        select(Response.form_id, func.count(Response.id).label("n"))
        .group_by(Response.form_id)
        .subquery()
    )
    rows = db.execute(
        select(
            Form,
            func.coalesce(q_count.c.n, 0),
            func.coalesce(r_count.c.n, 0),
        )
        .outerjoin(q_count, q_count.c.form_id == Form.id)
        .outerjoin(r_count, r_count.c.form_id == Form.id)
        .order_by(Form.updated_at.desc())
    ).all()
    return [
        {
            "id": f.id,
            "title": f.title,
            "slug": f.slug,
            "status": f.status,
            "theme": f.theme or {},
            "question_count": qn,
            "response_count": rn,
            "created_at": f.created_at,
            "updated_at": f.updated_at,
        }
        for f, qn, rn in rows
    ]


def touch(form: Form) -> None:
    form.updated_at = datetime.now(timezone.utc)


def sync_choices(q: Question, incoming: list[ChoiceIn]) -> None:
    """Upsert choices by id so existing answers keep pointing at the same choice."""
    existing = {c.id: c for c in q.choices}
    kept: list[Choice] = []
    for pos, item in enumerate(incoming):
        label = item.label.strip() or f"Choice {pos + 1}"
        if item.id is not None and item.id in existing:
            c = existing.pop(item.id)
            c.label, c.position = label, pos
        else:
            c = Choice(label=label, position=pos)
        kept.append(c)
    q.choices = kept  # delete-orphan removes the ones left in `existing`


def create_question(db: Session, form: Form, data: QuestionCreate) -> Question:
    questions = list(form.questions)
    insert_at = len(questions) if data.position is None else max(0, min(data.position, len(questions)))
    q = Question(
        type=data.type,
        title=data.title,
        description=data.description,
        required=data.required,
        settings={**DEFAULT_SETTINGS.get(data.type, {}), **data.settings},
        position=insert_at,
    )
    if data.type in CHOICE_TYPES:
        sync_choices(q, data.choices or [ChoiceIn(label=l) for l in DEFAULT_CHOICES])
    questions.insert(insert_at, q)
    for i, item in enumerate(questions):
        item.position = i
    form.questions = questions
    touch(form)
    db.commit()
    db.refresh(q)
    return q


def update_question(db: Session, q: Question, data: QuestionUpdate) -> Question:
    patch = data.model_dump(exclude_unset=True, exclude={"choices"})
    if "type" in patch and patch["type"] != q.type:
        # switching type: reset settings to the new type's defaults
        q.settings = dict(DEFAULT_SETTINGS.get(patch["type"], {}))
        if patch["type"] in CHOICE_TYPES and not q.choices and data.choices is None:
            sync_choices(q, [ChoiceIn(label=l) for l in DEFAULT_CHOICES])
        if patch["type"] not in CHOICE_TYPES:
            q.choices = []
    for key, value in patch.items():
        if key == "settings":
            value = {**(q.settings or {}), **value}
        setattr(q, key, value)
    if data.choices is not None and q.type in CHOICE_TYPES:
        if not data.choices:
            raise HTTPException(status_code=422, detail="A choice question needs at least one option")
        sync_choices(q, data.choices)
    touch(q.form)
    db.commit()
    db.refresh(q)
    return q


def delete_question(db: Session, form: Form, q: Question) -> None:
    db.delete(q)
    db.flush()
    remaining = [x for x in form.questions if x.id != q.id]
    for i, item in enumerate(remaining):
        item.position = i
    touch(form)
    db.commit()


def reorder_questions(db: Session, form: Form, order: list[int]) -> Form:
    by_id = {q.id: q for q in form.questions}
    if set(order) != set(by_id) or len(order) != len(by_id):
        raise HTTPException(status_code=422, detail="Order must contain every question id exactly once")
    for i, qid in enumerate(order):
        by_id[qid].position = i
    touch(form)
    db.commit()
    db.expire(form, ["questions"])
    return get_form_or_404(db, form.id)


def duplicate_form(db: Session, src: Form) -> Form:
    copy = Form(
        title=f"{src.title} (copy)",
        status="draft",
        welcome_enabled=src.welcome_enabled,
        welcome_title=src.welcome_title,
        welcome_description=src.welcome_description,
        welcome_button=src.welcome_button,
        thank_you_title=src.thank_you_title,
        thank_you_description=src.thank_you_description,
        theme=dict(src.theme or {}),
    )
    for q in src.questions:
        nq = Question(
            type=q.type,
            title=q.title,
            description=q.description,
            required=q.required,
            position=q.position,
            settings=dict(q.settings or {}),
        )
        nq.choices = [Choice(label=c.label, position=c.position) for c in q.choices]
        copy.questions.append(nq)
    db.add(copy)
    db.commit()
    return get_form_or_404(db, copy.id)


def set_status(db: Session, form: Form, status: str) -> Form:
    if status == "published":
        if not form.questions:
            raise HTTPException(status_code=422, detail="Add at least one question before publishing")
        form.published_at = datetime.now(timezone.utc)
    form.status = status
    touch(form)
    db.commit()
    return get_form_or_404(db, form.id)
