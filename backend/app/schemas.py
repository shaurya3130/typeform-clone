"""Pydantic request / response schemas (the API contract)."""
from datetime import datetime, timezone
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

# SQLite drops tzinfo; values are stored in UTC, so tag them on the way out.
UTCDatetime = Annotated[
    datetime,
    PlainSerializer(lambda d: (d if d.tzinfo else d.replace(tzinfo=timezone.utc)).isoformat()),
]

QuestionType = Literal[
    "short_text",
    "long_text",
    "multiple_choice",
    "dropdown",
    "email",
    "number",
    "yes_no",
    "rating",
]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Choices ----------
class ChoiceIn(BaseModel):
    id: int | None = None  # existing choice id (keep) or None (create)
    label: str = Field(max_length=255)


class ChoiceOut(ORM):
    id: int
    label: str
    position: int


# ---------- Questions ----------
class QuestionCreate(BaseModel):
    type: QuestionType
    title: str = ""
    description: str = ""
    required: bool = False
    settings: dict[str, Any] = {}
    choices: list[ChoiceIn] | None = None
    position: int | None = None  # insert index; default = append


class QuestionUpdate(BaseModel):
    type: QuestionType | None = None
    title: str | None = None
    description: str | None = None
    required: bool | None = None
    settings: dict[str, Any] | None = None
    choices: list[ChoiceIn] | None = None


class QuestionOut(ORM):
    id: int
    type: str
    title: str
    description: str
    required: bool
    position: int
    settings: dict[str, Any]
    choices: list[ChoiceOut]


class ReorderIn(BaseModel):
    order: list[int]  # question ids in their new order


# ---------- Forms ----------
class FormCreate(BaseModel):
    title: str = "My new form"


class FormUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    welcome_enabled: bool | None = None
    welcome_title: str | None = None
    welcome_description: str | None = None
    welcome_button: str | None = None
    thank_you_title: str | None = None
    thank_you_description: str | None = None
    theme: dict[str, Any] | None = None


class FormSummary(ORM):
    """Row in the dashboard list."""

    id: int
    title: str
    slug: str
    status: str
    theme: dict[str, Any]
    question_count: int
    response_count: int
    created_at: UTCDatetime
    updated_at: UTCDatetime


class FormDetail(ORM):
    id: int
    title: str
    slug: str
    status: str
    welcome_enabled: bool
    welcome_title: str
    welcome_description: str
    welcome_button: str
    thank_you_title: str
    thank_you_description: str
    theme: dict[str, Any]
    created_at: UTCDatetime
    updated_at: UTCDatetime
    published_at: UTCDatetime | None
    questions: list[QuestionOut]


class PublicForm(ORM):
    """What respondents see — no internal stats."""

    title: str
    slug: str
    welcome_enabled: bool
    welcome_title: str
    welcome_description: str
    welcome_button: str
    thank_you_title: str
    thank_you_description: str
    theme: dict[str, Any]
    questions: list[QuestionOut]


# ---------- Responses ----------
class SubmissionIn(BaseModel):
    # question_id -> raw value (str for text/email/yes_no, number, int rating, choice id)
    answers: dict[int, Any]


class AnswerOut(BaseModel):
    question_id: int | None
    question_title: str
    value: Any  # display value (choice label, text, number)


class ResponseOut(BaseModel):
    id: int
    submitted_at: UTCDatetime
    answers: list[AnswerOut]
