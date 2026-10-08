"""Seed data: published forms with mixed question types and existing responses.

Run manually with:  python -m app.seed  (add --reset to wipe first)
It also runs automatically on startup when the database is empty.
"""
import random
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import Answer, Choice, Form, Question, Response

FORMS = [
    {
        "title": "Customer Feedback Survey",
        "slug": "feedback",
        "status": "published",
        "welcome": ("We'd love your feedback", "It takes less than 2 minutes. Promise.", "Let's go"),
        "thank_you": ("Thanks for the feedback! 🙌", "Every answer helps us build a better product."),
        "theme": {},
        "questions": [
            ("short_text", "What's your name?", "First name is fine.", True, {}, None),
            ("email", "And your email address?", "We'll only use it to follow up on your feedback.", True, {}, None),
            ("rating", "How would you rate your overall experience?", "", True, {"scale": 5}, None),
            ("multiple_choice", "What do you use our product for most?", "", True, {},
             ["Work projects", "Personal use", "School", "Something else"]),
            ("yes_no", "Would you recommend us to a friend?", "", True, {}, None),
            ("long_text", "Anything we could do better?", "Be as honest as you like.", False, {}, None),
        ],
    },
    {
        "title": "Tech Meetup Registration",
        "slug": "meetup",
        "status": "published",
        "welcome": ("Join the Amritsar Dev Meetup", "Saturday evening · Talks, pizza and good people.", "Register"),
        "thank_you": ("You're on the list! 🎉", "We'll email you the venue details a day before."),
        "theme": {"background": "#0B1F3A", "question": "#FFFFFF", "answer": "#7DD3FC",
                  "button": "#7DD3FC", "button_text": "#0B1F3A"},
        "questions": [
            ("short_text", "What's your full name?", "", True, {}, None),
            ("email", "Your email, please", "Your ticket goes here.", True, {}, None),
            ("dropdown", "Which track interests you most?", "", True, {},
             ["Frontend", "Backend", "AI / ML", "DevOps", "Mobile", "Security"]),
            ("number", "How many years have you been coding?", "", False, {"min": 0, "max": 50}, None),
            ("yes_no", "Will you need a vegetarian meal?", "", True, {}, None),
            ("rating", "How excited are you, on a scale of 1–10?", "", False, {"scale": 10}, None),
        ],
    },
    {
        "title": "Product Launch Waitlist",
        "slug": "waitlist",
        "status": "draft",
        "welcome": None,
        "thank_you": ("You're in!", "We'll let you know the moment we launch."),
        "theme": {},
        "questions": [
            ("email", "What's your email?", "", True, {}, None),
            ("multiple_choice", "How did you hear about us?", "", False, {},
             ["Twitter / X", "LinkedIn", "A friend", "Search"]),
        ],
    },
]

NAMES = ["Aarav", "Diya", "Kabir", "Ananya", "Rohan", "Meera", "Arjun", "Isha", "Vikram", "Sara",
         "Neha", "Karan", "Priya", "Aditya", "Zoya", "Ishaan", "Tara", "Dev"]
FEEDBACK = [
    "Faster loading on mobile would be great.",
    "Love the clean design, keep it up!",
    "Dark mode please.",
    "The onboarding could be a bit shorter.",
    "Honestly it's perfect for what I need.",
    "More templates would help.",
]


def build_form(spec: dict) -> Form:
    form = Form(
        title=spec["title"],
        slug=spec["slug"],
        status=spec["status"],
        theme=spec["theme"],
        thank_you_title=spec["thank_you"][0],
        thank_you_description=spec["thank_you"][1],
    )
    if spec["welcome"]:
        form.welcome_enabled = True
        form.welcome_title, form.welcome_description, form.welcome_button = spec["welcome"]
    if spec["status"] == "published":
        form.published_at = datetime.now(timezone.utc) - timedelta(days=10)
    for pos, (qtype, title, desc, required, settings, choices) in enumerate(spec["questions"]):
        q = Question(type=qtype, title=title, description=desc, required=required,
                     settings=settings, position=pos)
        if choices:
            q.choices = [Choice(label=c, position=i) for i, c in enumerate(choices)]
        form.questions.append(q)
    return form


def fake_answer(q: Question, name: str, rng: random.Random) -> Answer | None:
    if not q.required and rng.random() < 0.25:
        return None
    a = Answer(question_id=q.id, question_title=q.title)
    if q.type == "short_text":
        a.value_text = name
    elif q.type == "email":
        a.value_text = f"{name.lower()}{rng.randint(1, 99)}@example.com"
    elif q.type == "long_text":
        a.value_text = rng.choice(FEEDBACK)
    elif q.type in ("multiple_choice", "dropdown"):
        c = rng.choices(q.choices, weights=[len(q.choices) - i for i in range(len(q.choices))])[0]
        a.choice_id, a.value_text = c.id, c.label
    elif q.type == "yes_no":
        a.value_text = "yes" if rng.random() < 0.72 else "no"
    elif q.type == "rating":
        scale = q.settings.get("scale", 5)
        a.value_number = float(max(1, min(scale, round(rng.gauss(scale * 0.78, scale * 0.15)))))
    elif q.type == "number":
        a.value_number = float(rng.randint(0, 12))
    return a


def seed(db: Session) -> None:
    rng = random.Random(42)
    now = datetime.now(timezone.utc)
    for spec, n_responses in zip(FORMS, (14, 9, 0)):
        form = build_form(spec)
        db.add(form)
        db.flush()  # assign ids
        for i in range(n_responses):
            name = rng.choice(NAMES)
            r = Response(form_id=form.id, submitted_at=now - timedelta(hours=i * 13 + rng.randint(0, 9)))
            r.answers = [a for q in form.questions if (a := fake_answer(q, name, rng))]
            db.add(r)
        form.view_count = int(n_responses * 1.4)
    db.commit()


def seed_if_empty(db: Session) -> bool:
    if db.scalar(select(Form.id).limit(1)) is not None:
        return False
    seed(db)
    return True


if __name__ == "__main__":
    if "--reset" in sys.argv:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        print("Seeded." if seed_if_empty(session) else "Database already has data (use --reset).")
