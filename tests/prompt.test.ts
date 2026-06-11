import { describe, expect, it } from "vitest";
import { buildChatMessages, getQuickActionInstruction, QUICK_ACTIONS } from "../src/shared/prompt";

describe("prompt builder", () => {
  it("defines the expected quick actions", () => {
    expect(QUICK_ACTIONS.map((action) => action.id)).toEqual([
      "polish",
      "shorten",
      "expand",
      "formalize",
      "translate_zh",
      "translate_en"
    ]);
  });

  it("returns a quick action instruction", () => {
    expect(getQuickActionInstruction("shorten")).toContain("Shorten");
  });

  it("builds chat messages with selected text and custom instruction", () => {
    const messages = buildChatMessages({
      selectedText: "这是一段草稿文字。",
      instruction: "改得更正式",
      quickActionId: null
    });

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
    expect(messages[1].content).toContain("改得更正式");
    expect(messages[1].content).toContain("这是一段草稿文字。");
  });

  it("uses quick action when custom instruction is blank", () => {
    const messages = buildChatMessages({
      selectedText: "Hello",
      instruction: " ",
      quickActionId: "translate_zh"
    });

    expect(messages[1].content).toContain("Translate");
    expect(messages[1].content).toContain("Chinese");
  });

  it("throws for empty selected text", () => {
    expect(() =>
      buildChatMessages({
        selectedText: "  ",
        instruction: "polish",
        quickActionId: null
      })
    ).toThrow("Selected text is required.");
  });
});
