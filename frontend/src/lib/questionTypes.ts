import {
  ChevronDown,
  Hash,
  ListChecks,
  Mail,
  Star,
  TextAlignStart,
  TextCursorInput,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";
import type { QuestionType } from "./types";

export interface QuestionTypeMeta {
  type: QuestionType;
  label: string;
  icon: LucideIcon;
  /** Chip color in the builder (Typeform color-codes question types). */
  color: string;
  group: "Text" | "Choice" | "Contact info" | "Rating & ranking" | "Other";
  description: string;
}

export const QUESTION_TYPES: QuestionTypeMeta[] = [
  { type: "short_text", label: "Short Text", icon: TextCursorInput, color: "#F7CFC2", group: "Text", description: "A single line answer" },
  { type: "long_text", label: "Long Text", icon: TextAlignStart, color: "#F7CFC2", group: "Text", description: "For longer, open answers" },
  { type: "multiple_choice", label: "Multiple Choice", icon: ListChecks, color: "#E2D6F7", group: "Choice", description: "Pick one from a list" },
  { type: "dropdown", label: "Dropdown", icon: ChevronDown, color: "#E2D6F7", group: "Choice", description: "Searchable list of options" },
  { type: "yes_no", label: "Yes/No", icon: ThumbsUp, color: "#E2D6F7", group: "Choice", description: "A simple yes or no" },
  { type: "email", label: "Email", icon: Mail, color: "#C9E3F5", group: "Contact info", description: "Validated email address" },
  { type: "number", label: "Number", icon: Hash, color: "#D3EBD8", group: "Other", description: "Numbers only, with limits" },
  { type: "rating", label: "Rating", icon: Star, color: "#FBE5A6", group: "Rating & ranking", description: "Stars from 1 to N" },
];

export const TYPE_META = Object.fromEntries(QUESTION_TYPES.map((m) => [m.type, m])) as Record<QuestionType, QuestionTypeMeta>;

/** Placeholder types shown in the "add question" modal as Coming Soon. */
export const COMING_SOON_TYPES = ["File Upload", "Payment", "Date", "Phone Number", "Picture Choice", "Ranking", "Matrix"];

export const CHOICE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
