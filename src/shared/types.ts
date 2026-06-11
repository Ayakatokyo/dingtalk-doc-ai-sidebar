export type QuickActionId =
  | "polish"
  | "shorten"
  | "expand"
  | "formalize"
  | "translate_zh"
  | "translate_en";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface AiSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface GenerateInput {
  selectedText: string;
  instruction: string;
  quickActionId: QuickActionId | null;
}

export interface GenerateRequest extends GenerateInput {
  type: "GENERATE";
}

export interface TestConnectionRequest {
  type: "TEST_CONNECTION";
}

export type RuntimeRequest = GenerateRequest | TestConnectionRequest;

export interface RuntimeSuccess {
  ok: true;
  text: string;
}

export interface RuntimeFailure {
  ok: false;
  error: string;
}

export type RuntimeResponse = RuntimeSuccess | RuntimeFailure;
