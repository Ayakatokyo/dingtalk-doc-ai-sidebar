export function readSelectedText(): string {
  return window.getSelection()?.toString().trim() || "";
}
