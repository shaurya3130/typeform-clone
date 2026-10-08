export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "dropdown"
  | "email"
  | "number"
  | "yes_no"
  | "rating";

export interface Choice {
  id?: number; // undefined until the server has saved it
  key: string; // stable client-side key for React lists
  label: string;
  position?: number;
}

export interface QuestionSettings {
  scale?: number; // rating: 3..10
  min?: number | null; // number
  max?: number | null; // number
  [k: string]: unknown;
}

export interface Question {
  id: number;
  type: QuestionType;
  title: string;
  description: string;
  required: boolean;
  position: number;
  settings: QuestionSettings;
  choices: Choice[];
}

export interface Theme {
  background?: string;
  question?: string;
  answer?: string;
  button?: string;
  button_text?: string;
  font?: string;
}

export type FormStatus = "draft" | "published";

export interface FormScreens {
  welcome_enabled: boolean;
  welcome_title: string;
  welcome_description: string;
  welcome_button: string;
  thank_you_title: string;
  thank_you_description: string;
}

export interface FormDetail extends FormScreens {
  id: number;
  title: string;
  slug: string;
  status: FormStatus;
  theme: Theme;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  questions: Question[];
}

export interface PublicForm extends FormScreens {
  title: string;
  slug: string;
  theme: Theme;
  questions: Question[];
}

export interface FormSummary {
  id: number;
  title: string;
  slug: string;
  status: FormStatus;
  theme: Theme;
  question_count: number;
  response_count: number;
  created_at: string;
  updated_at: string;
}

export type AnswerValue = string | number | null | undefined;
export type Answers = Record<number, AnswerValue>;

export interface ResponseRow {
  id: number;
  submitted_at: string;
  answers: { question_id: number | null; question_title: string; value: string | number | null }[];
}

export interface QuestionSummary {
  question_id: number;
  title: string;
  type: QuestionType;
  answered: number;
  skipped: number;
  options?: { label: string; count: number }[];
  average?: number | null;
  min?: number | null;
  max?: number | null;
  latest?: string[];
}

export interface FormStats {
  response_count: number;
  views: number;
  completion_rate: number | null;
  questions: QuestionSummary[];
}
