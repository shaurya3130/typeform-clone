"""Creator endpoints for reading results."""
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import ResponseOut
from ..services import responses as svc
from ..services.forms import get_form_or_404

router = APIRouter()


@router.get("/{form_id}/responses", response_model=list[ResponseOut])
def list_responses(form_id: int, db: Session = Depends(get_db)):
    get_form_or_404(db, form_id)
    return [svc.serialize_response(r) for r in svc.list_responses(db, form_id)]


@router.get("/{form_id}/responses/export.csv")
def export_csv(form_id: int, db: Session = Depends(get_db)):
    form = get_form_or_404(db, form_id)
    filename = f"{form.slug}-responses.csv"
    return Response(
        content=svc.export_csv(db, form),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{form_id}/responses/{response_id}", response_model=ResponseOut)
def get_response(form_id: int, response_id: int, db: Session = Depends(get_db)):
    return svc.serialize_response(svc.get_response_or_404(db, form_id, response_id))


@router.delete("/{form_id}/responses/{response_id}", status_code=204)
def delete_response(form_id: int, response_id: int, db: Session = Depends(get_db)):
    db.delete(svc.get_response_or_404(db, form_id, response_id))
    db.commit()
    return Response(status_code=204)


@router.get("/{form_id}/summary")
def summary(form_id: int, db: Session = Depends(get_db)):
    return svc.summarize(db, get_form_or_404(db, form_id))
