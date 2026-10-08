import type { AnswerValue, Question } from "./types";

// Mirrors backend/app/services/validation.py — the server re-checks everything.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isEmpty = (v: AnswerValue) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

export function validateAnswer(q: Question, value: AnswerValue): string | null {
  if (isEmpty(value)) return q.required ? "Please fill this in" : null;

  switch (q.type) {
    case "email":
      return EMAIL_RE.test(String(value).trim()) ? null : "Hmm... that email doesn't look right";
    case "number": {
      const n = Number(value);
      if (String(value).trim() === "" || Number.isNaN(n)) return "Numbers only please";
      const { min, max } = q.settings;
      if (min !== null && min !== undefined && n < min) return `Number must be greater or equal to ${min}`;
      if (max !== null && max !== undefined && n > max) return `Number must be lower or equal to ${max}`;
      return null;
    }
    case "multiple_choice":
    case "dropdown":
      return q.choices.some((c) => c.id === Number(value)) ? null : "Please select a valid option";
    case "yes_no":
      return value === "yes" || value === "no" ? null : "Please choose Yes or No";
    case "rating": {
      const scale = q.settings.scale ?? 5;
      const n = Number(value);
      return Number.isInteger(n) && n >= 1 && n <= scale ? null : "Please choose a rating";
    }
    default:
      return null;
  }
}
