"""Creator endpoints: form CRUD, publishing and question management."""
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Form
from ..schemas import (
    FormCreate,
    FormDetail,
    FormSummary,
    FormUpdate,
    QuestionCreate,
    QuestionOut,
    QuestionUpdate,
    ReorderIn,
)
from ..services import forms as svc

router = APIRouter()


# ---------- Forms ----------
@router.get("", response_model=list[FormSummary])
def list_forms(db: Session = Depends(get_db)):
    return svc.list_forms(db)


@router.post("", response_model=FormDetail, status_code=201)
def create_form(data: FormCreate, db: Session = Depends(get_db)):
    form = Form(title=data.title.strip() or "My new form")
    db.add(form)
    db.commit()
    return svc.get_form_or_404(db, form.id)


@router.get("/{form_id}", response_model=FormDetail)
def get_form(form_id: int, db: Session = Depends(get_db)):
    return svc.get_form_or_404(db, form_id)


@router.patch("/{form_id}", response_model=FormDetail)
def update_form(form_id: int, data: FormUpdate, db: Session = Depends(get_db)):
    form = svc.get_form_or_404(db, form_id)
    patch = data.model_dump(exclude_unset=True)
    if "title" in patch:
        patch["title"] = (patch["title"] or "").strip() or "Untitled form"
    if "theme" in patch:
        patch["theme"] = {**(form.theme or {}), **patch["theme"]}
    for key, value in patch.items():
        setattr(form, key, value)
    svc.touch(form)
    db.commit()
    return svc.get_form_or_404(db, form_id)


@router.delete("/{form_id}", status_code=204)
def delete_form(form_id: int, db: Session = Depends(get_db)):
    db.delete(svc.get_form_or_404(db, form_id))
    db.commit()
    return Response(status_code=204)


@router.post("/{form_id}/duplicate", response_model=FormDetail, status_code=201)
def duplicate_form(form_id: int, db: Session = Depends(get_db)):
    return svc.duplicate_form(db, svc.get_form_or_404(db, form_id))


@router.post("/{form_id}/publish", response_model=FormDetail)
def publish_form(form_id: int, db: Session = Depends(get_db)):
    return svc.set_status(db, svc.get_form_or_404(db, form_id), "published")


@router.post("/{form_id}/unpublish", response_model=FormDetail)
def unpublish_form(form_id: int, db: Session = Depends(get_db)):
    return svc.set_status(db, svc.get_form_or_404(db, form_id), "draft")


# ---------- Questions ----------
@router.post("/{form_id}/questions", response_model=QuestionOut, status_code=201)
def add_question(form_id: int, data: QuestionCreate, db: Session = Depends(get_db)):
    return svc.create_question(db, svc.get_form_or_404(db, form_id), data)


@router.put("/{form_id}/questions/reorder", response_model=FormDetail)
def reorder_questions(form_id: int, data: ReorderIn, db: Session = Depends(get_db)):
    return svc.reorder_questions(db, svc.get_form_or_404(db, form_id), data.order)


@router.patch("/{form_id}/questions/{question_id}", response_model=QuestionOut)
def update_question(form_id: int, question_id: int, data: QuestionUpdate, db: Session = Depends(get_db)):
    return svc.update_question(db, svc.get_question_or_404(db, form_id, question_id), data)


@router.delete("/{form_id}/questions/{question_id}", status_code=204)
def delete_question(form_id: int, question_id: int, db: Session = Depends(get_db)):
    form = svc.get_form_or_404(db, form_id)
    svc.delete_question(db, form, svc.get_question_or_404(db, form_id, question_id))
    return Response(status_code=204)
