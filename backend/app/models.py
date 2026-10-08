"""SQLAlchemy ORM models.

forms 1──* questions 1──* choices
forms 1──* responses 1──* answers *──1 questions
"""
import secrets
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

QUESTION_TYPES = (
    "short_text",
    "long_text",
    "multiple_choice",
    "dropdown",
    "email",
    "number",
    "yes_no",
    "rating",
)
CHOICE_TYPES = ("multiple_choice", "dropdown")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_slug() -> str:
    return secrets.token_urlsafe(6).replace("-", "a").replace("_", "b")


class Form(Base):
    __tablename__ = "forms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), default="My new form")
    slug: Mapped[str] = mapped_column(String(32), unique=True, index=True, default=new_slug)
    status: Mapped[str] = mapped_column(String(16), default="draft")  # draft | published

    # Welcome + thank-you screens
    welcome_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    welcome_title: Mapped[str] = mapped_column(String(255), default="")
    welcome_description: Mapped[str] = mapped_column(Text, default="")
    welcome_button: Mapped[str] = mapped_column(String(64), default="Start")
    thank_you_title: Mapped[str] = mapped_column(
        String(255), default="Thanks for completing this typeform"
    )
    thank_you_description: Mapped[str] = mapped_column(
        Text, default="Made with Typeform Clone — create your own form in minutes."
    )

    # Theme: {"background": "#fff", "question": "#262627", "answer": "#0445AF",
    #         "button": "#0445AF", "button_text": "#fff", "font": "Inter"}
    theme: Mapped[dict] = mapped_column(JSON, default=dict)

    # Bonus: completion-rate tracking (respondent opened the form)
    view_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    questions: Mapped[list["Question"]] = relationship(
        back_populates="form",
        order_by="Question.position",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    responses: Mapped[list["Response"]] = relationship(
        back_populates="form", cascade="all, delete-orphan", passive_deletes=True
    )


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_id: Mapped[int] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"), index=True, nullable=False
    )
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(500), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    # Type-specific settings, e.g. {"min": 0, "max": 100} or {"scale": 5}
    settings: Mapped[dict] = mapped_column(JSON, default=dict)

    form: Mapped[Form] = relationship(back_populates="questions")
    choices: Mapped[list["Choice"]] = relationship(
        back_populates="question",
        order_by="Choice.position",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Choice(Base):
    __tablename__ = "choices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    question: Mapped[Question] = relationship(back_populates="choices")


class Response(Base):
    __tablename__ = "responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_id: Mapped[int] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"), index=True, nullable=False
    )
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    form: Mapped[Form] = relationship(back_populates="responses")
    answers: Mapped[list["Answer"]] = relationship(
        back_populates="response", cascade="all, delete-orphan", passive_deletes=True
    )


class Answer(Base):
    """One answer to one question inside one response.

    question_id / choice_id use ON DELETE SET NULL so historic responses survive
    when a creator edits the form; question_title snapshots what was asked.
    """

    __tablename__ = "answers"
    __table_args__ = (UniqueConstraint("response_id", "question_id", name="uq_answer_per_q"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    response_id: Mapped[int] = mapped_column(
        ForeignKey("responses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    question_id: Mapped[int | None] = mapped_column(
        ForeignKey("questions.id", ondelete="SET NULL"), index=True, nullable=True
    )
    question_title: Mapped[str] = mapped_column(String(500), default="")
    value_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_number: Mapped[float | None] = mapped_column(Float, nullable=True)
    choice_id: Mapped[int | None] = mapped_column(
        ForeignKey("choices.id", ondelete="SET NULL"), nullable=True
    )

    response: Mapped[Response] = relationship(back_populates="answers")
