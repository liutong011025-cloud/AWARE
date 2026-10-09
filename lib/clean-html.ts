import sanitizeHtml from "sanitize-html";
import { allowedFont } from "./editor-format";

export function cleanHTML(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "div", "b", "strong", "i", "em", "u", "ul", "ol", "li", "blockquote", "h2", "span", "font"],
    allowedAttributes: { font: ["face", "size"] },
    disallowedTagsMode: "discard",
    nonTextTags: ["style", "script", "textarea", "option", "noscript", "iframe", "object", "svg", "math", "template"],
    transformTags: {
      font: (tagName, attribs) => {
        const face = allowedFont(attribs.face ?? null);
        const size = attribs.size && /^[1-7]$/.test(attribs.size) ? attribs.size : undefined;
        const next: Record<string, string> = {};
        if (face) next.face = face;
        if (size) next.size = size;
        return { tagName, attribs: next };
      },
    },
  });
}
