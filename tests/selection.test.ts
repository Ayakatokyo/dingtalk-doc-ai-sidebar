import { describe, expect, it } from "vitest";
import { readSelectedText } from "../src/content/selection";

describe("selection reading", () => {
  it("returns trimmed selected text", () => {
    const paragraph = document.createElement("p");
    paragraph.textContent = "  DingTalk selected text  ";
    document.body.append(paragraph);

    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    expect(readSelectedText()).toBe("DingTalk selected text");
  });

  it("returns an empty string when nothing is selected", () => {
    window.getSelection()?.removeAllRanges();
    expect(readSelectedText()).toBe("");
  });
});
