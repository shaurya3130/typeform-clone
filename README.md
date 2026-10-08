# Typeform Clone

A full-stack clone of [Typeform](https://www.typeform.com): build forms in a three-panel builder, publish them behind a shareable link, collect answers through the one-question-at-a-time conversational flow, and analyse results.

| | |
|---|---|
| **Frontend** | Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Framer Motion · dnd-kit · react-hot-toast · lucide-react |
| **Backend** | Python 3.11+ · FastAPI · SQLAlchemy 2 · Pydantic 2 |
| **Database** | SQLite (schema below) |

**Live demo:** _add your Vercel URL here_ · **API docs:** `<backend-url>/docs`

---

## Features

### Core
- **Form builder** — question list (drag-and-drop reorder), live themed canvas with **inline editing** of titles, descriptions and choices, and a settings panel (type, required, rating steps, number min/max). Edits autosave with a debounce and a *Saving… / Saved* indicator.
- **8 question types** — Short text, Long text, Multiple choice, Dropdown (searchable), Email, Number, Yes/No, Rating (3–10 stars).
- **Form management** — dashboard with status (Draft/Live) and response counts; create, rename (modal or inline in the top bar), duplicate, delete; publish/unpublish with a public `/to/<slug>` link.
- **Respondent flow** — full-screen, one question at a time, animated slide transitions, progress bar, keyboard control (**Enter** = OK, **↑/↓** = previous/next, **A–Z** picks choices, **Y/N** for yes/no, **1–9/0** for ratings, **Shift+Enter** for new lines), auto-advance after picking a choice, welcome and thank-you screens. **No login required.**
- **Validation on both sides** — `frontend/src/lib/validation.ts` gives instant feedback; `backend/app/services/validation.py` re-checks every answer and returns per-question errors (the runner jumps back to the offending question).
- **Results** — Summary tab (choice / yes-no / rating distributions with %, number avg/min/max, latest text answers) and a Responses table with a side drawer showing one full response (prev/next, delete).
- **Typeform feel** — modals, toasts, inline editing, preview modal with desktop/mobile toggle, settings placeholders.

### Bonus
- **Custom themes** — 6 presets plus custom colours (background, questions, answers, buttons, button text) and fonts; applied to the canvas, preview, public form and dashboard thumbnails.
- **CSV export** of responses.
- **Completion rate** — views are tracked when a respondent opens the form; Results shows views, responses and completion %.

### Placeholders ("Coming soon")
Logic jumps (Workflow tab), Integrations/webhooks (Connect tab), team collaboration, embed/email/QR sharing, file-upload/payment and other question types, background images.

---

## Running locally

**Requirements:** Python 3.11+, Node 18.18+ (20+ recommended).

```bash
# 1. Backend  (http://localhost:8000, Swagger at /docs)
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The database file `backend/typeform.db` is created and **seeded automatically** on first start (2 published forms with 23 responses, plus 1 draft). To reset it: `python -m app.seed --reset`.

```bash
# 2. Frontend  (http://localhost:3000)
cd frontend
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:8000/api
npm install
npm run dev
```

Try the seeded public forms at `http://localhost:3000/to/feedback` and `http://localhost:3000/to/meetup`.

### Environment variables

| Where | Variable | Default | Purpose |
|---|---|---|---|
| backend | `DATABASE_URL` | `sqlite:///./typeform.db` | SQLAlchemy URL |
| backend | `CORS_ORIGINS` | `*` | Comma-separated allowed origins (set to your Vercel URL in production) |
| backend | `SEED_ON_STARTUP` | `true` | Seed demo data when the DB is empty |
| frontend | `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Backend base URL |

---

## Deployment

**Backend → Render** (a `render.yaml` blueprint is included)
1. New → *Blueprint* → pick this repo, or New → *Web Service* with root directory `backend`.
2. Build: `pip install -r requirements.txt` · Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Set `CORS_ORIGINS` to your Vercel URL after step 2 below.

**Frontend → Vercel**
1. Import the repo, set **Root Directory** to `frontend` (framework auto-detected).
2. Add `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com/api` and deploy.

> Render's free tier has an ephemeral disk, so the SQLite file resets on redeploy/restart; the app re-seeds itself so the demo is always usable. Attach a persistent disk (and point `DATABASE_URL` at it) for durable data. The free tier also sleeps after inactivity — the first request can take ~30 s.

---

## Architecture

```
┌──────────────────────────── Next.js (frontend/) ────────────────────────────┐
│ app/page.tsx                 Dashboard (workspace, form cards, modals)      │
│ app/forms/[id]/layout.tsx    Loads form → FormEditorProvider + top bar      │
│   create/   Builder: QuestionList | Canvas | SettingsPanel                  │
│   share/ results/ workflow/ connect/                                        │
│ app/to/[slug]/page.tsx       Public respondent page → <FormRunner/>         │
│                                                                             │
│ components/runner/   FormRunner (flow, keys, transitions) + answers.tsx     │
│                      ↑ reused by the builder canvas and the Preview modal   │
│ components/builder/  FormEditorContext (state + debounced autosave)         │
│ lib/api.ts           Typed fetch client — the only place that talks HTTP    │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ JSON / REST
┌──────────────────────────── FastAPI (backend/) ─────────────────────────────┐
│ routers/   forms.py · responses.py · public.py   (HTTP only, thin)          │
│ services/  forms.py · responses.py · validation.py   (business logic)       │
│ schemas.py Pydantic request/response contracts                              │
│ models.py  SQLAlchemy ORM  →  SQLite                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

Key decisions:
- **Routers → services → models.** Routers only parse/serialize; rules like reordering, choice syncing, validation and stats live in services so they are testable and reusable.
- **One set of answer components** (`components/runner/answers.tsx`) renders every question type for the respondent flow, the builder canvas (inert preview) and the preview modal — the builder literally shows what respondents will see.
- **Optimistic, debounced autosave.** Every keystroke updates local state (live preview); text edits are PATCHed after 600 ms of idle time, merged per question. Structural changes (add/delete/reorder/change type) save immediately and roll back on failure.
- **Theme via CSS variables** (`--tf-bg`, `--tf-q`, `--tf-a`, `--tf-btn`…) consumed by `.tf-*` classes, so a theme change re-skins the canvas, preview and public form with no component changes.
- **Public endpoints are separate** (`/api/public/...`), look forms up by unguessable `slug`, only serve **published** forms, and never expose internal stats.

---

## Database schema

```
forms 1 ──< questions 1 ──< choices
  1                 1 (SET NULL)    1 (SET NULL)
  └──< responses 1 ──< answers >────┘
```

**forms**
| column | type | notes |
|---|---|---|
| id | INTEGER PK | |
| title | VARCHAR(255) | |
| slug | VARCHAR(32) UNIQUE, indexed | public link `/to/<slug>` |
| status | VARCHAR(16) | `draft` \| `published` |
| welcome_enabled, welcome_title, welcome_description, welcome_button | | welcome screen |
| thank_you_title, thank_you_description | | ending screen |
| theme | JSON | colours + font |
| view_count | INTEGER | for completion rate |
| created_at, updated_at, published_at | DATETIME (UTC) | |

**questions** — `id` PK · `form_id` FK→forms **ON DELETE CASCADE** · `type` · `title` · `description` · `required` BOOL · `position` INT (order) · `settings` JSON (`{"scale":5}`, `{"min":0,"max":50}`)

**choices** — `id` PK · `question_id` FK→questions **CASCADE** · `label` · `position`

**responses** — `id` PK · `form_id` FK→forms **CASCADE** · `submitted_at`

**answers** — `id` PK · `response_id` FK→responses **CASCADE** · `question_id` FK→questions **SET NULL** · `question_title` (snapshot) · `value_text` · `value_number` · `choice_id` FK→choices **SET NULL** · UNIQUE(`response_id`, `question_id`)

Why it looks like this:
- **Choices are rows, not a JSON blob**, so summary stats are a `GROUP BY choice_id` and answers reference a real choice. Choice edits are *upserted by id*, so renaming a choice keeps old answers attached to it.
- **`position` columns** make drag-and-drop a single `PUT /reorder` that rewrites positions in one transaction.
- **Typed answer columns** (`value_text` / `value_number` / `choice_id`) keep numbers numeric for averages and choices relational for counts.
- **History survives edits.** Deleting a question sets `answers.question_id` to NULL instead of deleting answers, and `question_title` is snapshotted at submit time, so old responses still read correctly ("deleted question" in the drawer). Deleting a whole form cascades everything.
- `PRAGMA foreign_keys=ON` is set on every connection — SQLite ignores FKs otherwise.

---

## API overview

Base URL: `/api` · interactive docs at `/docs`.

**Forms (creator)**
| Method | Path | Description |
|---|---|---|
| GET | `/forms` | List forms with question & response counts |
| POST | `/forms` | Create `{title}` |
| GET | `/forms/{id}` | Form with ordered questions and choices |
| PATCH | `/forms/{id}` | Update title, welcome/thank-you screens, theme |
| DELETE | `/forms/{id}` | Delete form (cascades) |
| POST | `/forms/{id}/duplicate` | Copy as a new draft |
| POST | `/forms/{id}/publish` · `/unpublish` | Toggle status (publishing needs ≥1 question) |

**Questions**
| Method | Path | Description |
|---|---|---|
| POST | `/forms/{id}/questions` | Add `{type, position?}` (defaults per type) |
| PATCH | `/forms/{id}/questions/{qid}` | Update fields; `choices: [{id?, label}]` are upserted |
| DELETE | `/forms/{id}/questions/{qid}` | Delete and re-number |
| PUT | `/forms/{id}/questions/reorder` | `{order: [qid, ...]}` — must contain every id once |

**Results**
| Method | Path | Description |
|---|---|---|
| GET | `/forms/{id}/responses` | All submissions, newest first |
| GET | `/forms/{id}/responses/{rid}` | One submission |
| DELETE | `/forms/{id}/responses/{rid}` | Delete one submission |
| GET | `/forms/{id}/summary` | Views, completion rate and per-question stats |
| GET | `/forms/{id}/responses/export.csv` | CSV download |

**Public (no auth)**
| Method | Path | Description |
|---|---|---|
| GET | `/public/forms/{slug}` | Published form only (404 otherwise) |
| POST | `/public/forms/{slug}/view` | Count a view |
| POST | `/public/forms/{slug}/responses` | Submit `{answers: {qid: value}}` → `201` or `422 {errors: {qid: message}}` |

Answer values: text/email → string · number → number or numeric string · multiple choice/dropdown → choice id · yes/no → `"yes"`/`"no"` · rating → integer `1..scale`.

---

## Assumptions

- **Single default creator.** Authentication is out of scope; every builder route acts as one logged-in creator. Adding auth would mean a `users` table and `forms.owner_id`.
- **Single-select** multiple choice (Typeform's default); multi-select would store one answer row per choice.
- Published forms stay editable (as in Typeform); edits apply to new respondents immediately.
- Changing a question's type resets its type-specific settings; existing answers keep their stored values and titles.
- A "view" is counted once per page load of the public form; completion rate = responses ÷ views.
- Dates are stored in UTC and rendered in the viewer's local time.

## Project structure

```
backend/
  app/
    main.py            app, CORS, startup (create tables + seed)
    database.py        engine, session, FK pragma
    models.py          ORM tables
    schemas.py         Pydantic contracts
    routers/           forms.py, responses.py, public.py
    services/          forms.py, responses.py, validation.py
    seed.py            demo data (python -m app.seed --reset)
  requirements.txt
frontend/
  src/app/             routes (dashboard, /forms/[id]/*, /to/[slug])
  src/components/      runner/, builder/, dashboard/, results/, ui/
  src/lib/             api.ts, types.ts, validation.ts, theme.ts, questionTypes.ts, format.ts
render.yaml            Render blueprint for the backend
```
