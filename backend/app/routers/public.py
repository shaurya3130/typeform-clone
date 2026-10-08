"""Public respondent endpoints — no authentication, published forms only."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Form, Question
from ..schemas import PublicForm, SubmissionIn
from ..services.responses import submit_response

router = APIRouter()


def get_published_or_404(db: Session, slug: str) -> Form:
    form = db.scalar(
        select(Form)
        .where(Form.slug == slug)
        .options(selectinload(Form.questions).selectinload(Question.choices))
    )
    if not form or form.status != "published":
        raise HTTPException(status_code=404, detail="This typeform is not accepting responses")
    return form


@router.get("/forms/{slug}", response_model=PublicForm)
def get_public_form(slug: str, db: Session = Depends(get_db)):
    return get_published_or_404(db, slug)


@router.post("/forms/{slug}/view", status_code=204)
def register_view(slug: str, db: Session = Depends(get_db)):
    """Called once when a respondent opens the form — powers completion rate."""
    form = get_published_or_404(db, slug)
    db.execute(update(Form).where(Form.id == form.id).values(view_count=Form.view_count + 1, updated_at=Form.updated_at))
    db.commit()


@router.post("/forms/{slug}/responses", status_code=201)
def submit(slug: str, data: SubmissionIn, db: Session = Depends(get_db)):
    resp = submit_response(db, get_published_or_404(db, slug), data.answers)
    return {"id": resp.id}
