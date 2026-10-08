"""FastAPI application entry point."""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, SessionLocal, engine
from .routers import forms, public, responses
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if os.getenv("SEED_ON_STARTUP", "true").lower() == "true":
        with SessionLocal() as db:
            seed_if_empty(db)
    yield


app = FastAPI(title="Typeform Clone API", version="1.0.0", lifespan=lifespan)

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forms.router, prefix="/api/forms", tags=["forms"])
app.include_router(responses.router, prefix="/api/forms", tags=["responses"])
app.include_router(public.router, prefix="/api/public", tags=["public"])


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok"}
