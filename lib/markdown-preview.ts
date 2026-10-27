import { marked } from "marked";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";

export interface MarkdownStats { words: number; chars: number; lines: number; readingMinutes: number; }

export function renderMarkdown(markdown: string): string {
  return marked.parse(markdown) as string;
}

export function getMarkdownStats(markdown: string): MarkdownStats {
  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  return { words, chars: markdown.length, lines: markdown ? markdown.split("\n").length : 0, readingMinutes: Math.max(1, Math.ceil(words / 200)) };
}

export function insertMarkdown(markdown: string, start: number, end: number, before: string, after = before, placeholder = "text") {
  const selected = markdown.slice(start, end) || placeholder;
  return { value: markdown.slice(0, start) + before + selected + after + markdown.slice(end), selectionStart: start + before.length, selectionEnd: start + before.length + selected.length };
}

const STARTER_TABLE = "| Header | Header |\n| --- | --- |\n| Cell | Cell |\n";

/**
 * Puts the starter table at `position`, adding only the line breaks that are missing. A table needs a
 * blank line before it, or its header row is glued to the text above, and a blank line after it, or the
 * next line of text becomes another row of the table. In an empty editor the table goes in as it is.
 */
export function insertTableMarkdown(markdown: string, position: number): string {
  const at = Math.min(Math.max(position, 0), markdown.length);
  const before = markdown.slice(0, at);
  const after = markdown.slice(at);

  const lineStart = before.lastIndexOf("\n") + 1;
  let lead = "";
  if (before.slice(lineStart).trim() !== "") {
    // Text comes before the cursor on this line: end the line and leave a blank one.
    lead = "\n\n";
  } else if (lineStart > 0 && !/(^|\n)[ \t]*\n$/.test(before.slice(0, lineStart))) {
    // The cursor is at the start of a line, and the line above it has text.
    lead = "\n";
  }
  // The table ends with a line break. Text right after it needs a blank line; a line break already there is one.
  const trail = after !== "" && !after.startsWith("\n") ? "\n" : "";

  return before + lead + STARTER_TABLE + trail + after;
}

function safeLanguage(lang: string | undefined) {
  return (lang ?? "").split(/[ \t]/)[0].toLowerCase().replace(/[^\w-]/g, "");
}

marked.use({ renderer: { code({ text, lang }) {
  const language = safeLanguage(lang);
  const grammar = language && Prism.languages[language];
  const highlighted = grammar ? Prism.highlight(text, grammar, language) : Prism.util.encode(text);
  return `<pre class="language-${language || "text"}"><code>${highlighted}</code></pre>`;
} } });
marked.setOptions({ gfm: true, breaks: true });
