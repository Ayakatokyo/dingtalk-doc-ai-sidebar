import { describe, expect, it } from "vitest";
import { createSidebar, setLoading } from "../src/content/sidebar";

describe("sidebar loading states", () => {
  it("changes and restores the generate button label", () => {
    const sidebar = createSidebar();

    setLoading(sidebar, true, "Generating...");
    expect(sidebar.generateButton.textContent).toBe("Generating...");

    setLoading(sidebar, false);
    expect(sidebar.generateButton.textContent).toBe("Generate");
  });

  it("changes and restores the test button without changing generate label", () => {
    const sidebar = createSidebar();

    setLoading(sidebar, true, "Testing...");

    expect(sidebar.testConnectionButton.textContent).toBe("Testing...");
    expect(sidebar.generateButton.textContent).toBe("Generate");

    setLoading(sidebar, false);

    expect(sidebar.testConnectionButton.textContent).toBe("Test");
    expect(sidebar.generateButton.textContent).toBe("Generate");
  });
});
