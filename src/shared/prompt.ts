import type { ChatMessage, GenerateInput, QuickActionId } from "./types";

export interface QuickAction {
  id: QuickActionId;
  label: string;
  instruction: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "polish",
    label: "Polish",
    instruction: "Polish the selected text while preserving its original meaning."
  },
  {
    id: "shorten",
    label: "Shorten",
    instruction: "Shorten the selected text and keep the key information."
  },
  {
    id: "expand",
    label: "Expand",
    instruction: "Expand the selected text with clearer detail while avoiding unsupported facts."
  },
  {
    id: "formalize",
    label: "Formalize",
    instruction: "Rewrite the selected text in a more formal and professional tone."
  },
  {
    id: "translate_zh",
    label: "To Chinese",
    instruction: "Translate the selected text into Chinese."
  },
  {
    id: "translate_en",
    label: "To English",
    instruction: "Translate the selected text into English."
  }
];

const SYSTEM_PROMPT = [
  "You are an AI writing assistant for document editing.",
  "Edit only the text provided by the user.",
  "Preserve the original meaning unless the instruction explicitly asks for a transformation.",
  "Do not invent unsupported facts.",
  "For rewrite, polish, shorten, expand, formalize, or translation tasks, return only the final edited text."
].join(" ");

export function getQuickActionInstruction(id: QuickActionId): string {
  const action = QUICK_ACTIONS.find((item) => item.id === id);
  if (!action) throw new Error(`Unknown quick action: ${id}`);
  return action.instruction;
}

export function buildChatMessages(input: GenerateInput): ChatMessage[] {
  const selectedText = input.selectedText.trim();
  if (!selectedText) throw new Error("Selected text is required.");

  const instruction =
    input.instruction.trim() ||
    (input.quickActionId ? getQuickActionInstruction(input.quickActionId) : "");

  if (!instruction) throw new Error("Instruction is required.");

  return [
    {
      role: "system",
      content: SYSTEM_PROMPT
    },
    {
      role: "user",
      content: [
        `Instruction: ${instruction}`,
        "",
        "Selected text:",
        selectedText
      ].join("\n")
    }
  ];
}
