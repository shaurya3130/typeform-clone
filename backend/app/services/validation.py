"""Server-side answer validation.

The frontend validates too (for instant feedback), but the server is the source
of truth: anyone can POST to the public endpoint directly.
"""
from typing import Any

from email_validator import EmailNotValidError, validate_email

from ..models import Question

MAX_SHORT_TEXT = 1000
MAX_LONG_TEXT = 10000


def is_empty(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def validate_answer(q: Question, value: Any) -> str | None:
    """Return an error message, or None if the value is acceptable."""
    if is_empty(value):
        return "Please fill this in" if q.required else None

    settings = q.settings or {}

    if q.type in ("short_text", "long_text"):
        if not isinstance(value, str):
            return "Answer must be text"
        limit = MAX_SHORT_TEXT if q.type == "short_text" else MAX_LONG_TEXT
        if len(value) > limit:
            return f"Answer must be at most {limit} characters"

    elif q.type == "email":
        if not isinstance(value, str):
            return "Hmm... that email doesn't look right"
        try:
            validate_email(value.strip(), check_deliverability=False)
        except EmailNotValidError:
            return "Hmm... that email doesn't look right"

    elif q.type == "number":
        if isinstance(value, bool):
            return "Numbers only please"
        try:
            n = float(value)
        except (TypeError, ValueError):
            return "Numbers only please"
        if settings.get("min") is not None and n < float(settings["min"]):
            return f"Number must be greater or equal to {settings['min']}"
        if settings.get("max") is not None and n > float(settings["max"]):
            return f"Number must be lower or equal to {settings['max']}"

    elif q.type in ("multiple_choice", "dropdown"):
        valid_ids = {c.id for c in q.choices}
        try:
            if int(value) not in valid_ids:
                return "Please select a valid option"
        except (TypeError, ValueError):
            return "Please select a valid option"

    elif q.type == "yes_no":
        if value not in ("yes", "no"):
            return "Please choose Yes or No"

    elif q.type == "rating":
        scale = int(settings.get("scale", 5))
        if isinstance(value, bool) or not isinstance(value, (int, float)) or int(value) != value:
            return "Please choose a rating"
        if not 1 <= int(value) <= scale:
            return f"Rating must be between 1 and {scale}"

    return None
