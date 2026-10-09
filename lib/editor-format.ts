export const editorFonts = ["Arial", "Georgia", "Times New Roman", "Verdana", "Courier New"] as const;
// Native editing sizes preserve the browser's undo history. CSS maps them to pixels.
export const editorSizes = [12, 14, 16, 19, 24, 28, 32] as const;

export function allowedFont(value: string | null) {
  return editorFonts.find(font => font.toLowerCase() === value?.trim().toLowerCase());
}
