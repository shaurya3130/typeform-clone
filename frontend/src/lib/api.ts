import type {
  Answers,
  Choice,
  FormDetail,
  FormStats,
  FormSummary,
  PublicForm,
  Question,
  QuestionType,
  ResponseRow,
} from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection.", 0);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body?.detail;
    if (detail && typeof detail === "object" && "errors" in detail) {
      throw new ApiError(detail.message ?? "Invalid answers", res.status, detail.errors);
    }
    const msg = typeof detail === "string" ? detail : Array.isArray(detail) ? detail[0]?.msg : "Something went wrong";
    throw new ApiError(msg ?? "Something went wrong", res.status);
  }
  return body as T;
}

const json = (data: unknown) => JSON.stringify(data);

/** Server choices have no client key — add a stable one. */
let keySeq = 0;
export const newKey = () => `k${Date.now().toString(36)}${(keySeq++).toString(36)}`;
const withKeys = (q: Question): Question => ({
  ...q,
  choices: (q.choices ?? []).map((c) => ({ ...c, key: c.key ?? `c${c.id}` })),
});
const formWithKeys = <F extends { questions: Question[] }>(f: F): F => ({ ...f, questions: f.questions.map(withKeys) });

const choicesPayload = (choices: Choice[]) => choices.map((c) => ({ id: c.id ?? null, label: c.label }));

export type QuestionPatch = Partial<Pick<Question, "type" | "title" | "description" | "required" | "settings" | "choices">>;
export type FormPatch = Partial<
  Pick<
    FormDetail,
    | "title"
    | "theme"
    | "welcome_enabled"
    | "welcome_title"
    | "welcome_description"
    | "welcome_button"
    | "thank_you_title"
    | "thank_you_description"
  >
>;

export const api = {
  // Forms
  listForms: () => request<FormSummary[]>("/forms"),
  createForm: (title: string) => request<FormDetail>("/forms", { method: "POST", body: json({ title }) }).then(formWithKeys),
  getForm: (id: number) => request<FormDetail>(`/forms/${id}`).then(formWithKeys),
  updateForm: (id: number, patch: FormPatch) =>
    request<FormDetail>(`/forms/${id}`, { method: "PATCH", body: json(patch) }).then(formWithKeys),
  deleteForm: (id: number) => request<void>(`/forms/${id}`, { method: "DELETE" }),
  duplicateForm: (id: number) => request<FormDetail>(`/forms/${id}/duplicate`, { method: "POST" }).then(formWithKeys),
  publish: (id: number) => request<FormDetail>(`/forms/${id}/publish`, { method: "POST" }).then(formWithKeys),
  unpublish: (id: number) => request<FormDetail>(`/forms/${id}/unpublish`, { method: "POST" }).then(formWithKeys),

  // Questions
  addQuestion: (formId: number, type: QuestionType, position?: number) =>
    request<Question>(`/forms/${formId}/questions`, { method: "POST", body: json({ type, position }) }).then(withKeys),
  updateQuestion: (formId: number, qid: number, patch: QuestionPatch) =>
    request<Question>(`/forms/${formId}/questions/${qid}`, {
      method: "PATCH",
      body: json({ ...patch, choices: patch.choices ? choicesPayload(patch.choices) : undefined }),
    }).then(withKeys),
  deleteQuestion: (formId: number, qid: number) =>
    request<void>(`/forms/${formId}/questions/${qid}`, { method: "DELETE" }),
  reorderQuestions: (formId: number, order: number[]) =>
    request<FormDetail>(`/forms/${formId}/questions/reorder`, { method: "PUT", body: json({ order }) }).then(formWithKeys),

  // Results
  listResponses: (formId: number) => request<ResponseRow[]>(`/forms/${formId}/responses`),
  deleteResponse: (formId: number, rid: number) =>
    request<void>(`/forms/${formId}/responses/${rid}`, { method: "DELETE" }),
  summary: (formId: number) => request<FormStats>(`/forms/${formId}/summary`),
  csvUrl: (formId: number) => `${API_URL}/forms/${formId}/responses/export.csv`,

  // Public (respondent)
  getPublicForm: (slug: string) => request<PublicForm>(`/public/forms/${slug}`).then(formWithKeys),
  registerView: (slug: string) => request<void>(`/public/forms/${slug}/view`, { method: "POST" }).catch(() => {}),
  submit: (slug: string, answers: Answers) =>
    request<{ id: number }>(`/public/forms/${slug}/responses`, { method: "POST", body: json({ answers }) }),
};
