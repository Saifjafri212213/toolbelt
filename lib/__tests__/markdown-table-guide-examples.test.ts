import { describe, expect, it } from "vitest";
import Prism from "prismjs";
import { getGuide, getGuidesForTool } from "../guides";
import { renderMarkdown } from "../markdown-preview";

// Every example in the "How to Make a Table in Markdown" guide, run through the Markdown Live
// Preview's own renderer, so the guide cannot drift from what the tool does.
// (The claims that depend on the browser-side sanitizing are in MarkdownTableGuide.test.tsx.)

const html = (...lines: string[]) => renderMarkdown(lines.join("\n")).replace(/\n/g, "");
const cells = (rendered: string, tag: "th" | "td") =>
  [...rendered.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>(.*?)</${tag}>`, "g"))].map((match) => match[1]);

describe("table guide: the parts of a table", () => {
  it("renders the first example with its header and two rows", () => {
    const out = html("| Name | Role | Team |", "| --- | --- | --- |", "| Ada | Engineer | Platform |", "| Grace | Reviewer | Docs |");
    expect(cells(out, "th")).toEqual(["Name", "Role", "Team"]);
    expect(cells(out, "td")).toEqual(["Ada", "Engineer", "Platform", "Grace", "Reviewer", "Docs"]);
  });

  it("does not need the pipes at the start and end", () => {
    const out = html("Name | Role", "--- | ---", "Ada | Engineer");
    expect(cells(out, "th")).toEqual(["Name", "Role"]);
    expect(cells(out, "td")).toEqual(["Ada", "Engineer"]);
  });

  it("does not need the pipes to line up, and trims spaces around the cells", () => {
    const out = html("|a|b|", "|:-:|--:|", "|1|2|");
    expect(cells(out, "th")).toEqual(["a", "b"]);
    expect(html("|  a  |   b |", "| --- | --- |", "| 1 | 2 |")).toBe(html("| a | b |", "| --- | --- |", "| 1 | 2 |"));
  });

  it("renders a header and separator with no rows as a table with no body", () => {
    const out = html("| a | b |", "| --- | --- |");
    expect(out).toContain("<table>");
    expect(cells(out, "th")).toEqual(["a", "b"]);
    expect(out).not.toContain("<td");
  });

  it("makes a table with an empty header from empty header cells", () => {
    const out = html("|  |  |", "| --- | --- |", "| 1 | 2 |");
    expect(out).toContain("<table>");
    expect(cells(out, "th")).toEqual(["", ""]);
    expect(cells(out, "td")).toEqual(["1", "2"]);
  });
});

describe("table guide: alignment", () => {
  const out = html("| Left | Center | Right | Default |", "| :--- | :---: | ---: | --- |", "| a | b | c | d |");

  it("sets align on the heading and every cell of an aligned column", () => {
    expect(out).toContain('<th align="left">Left</th>');
    expect(out).toContain('<th align="center">Center</th>');
    expect(out).toContain('<th align="right">Right</th>');
    expect(out).toContain('<td align="left">a</td>');
    expect(out).toContain('<td align="center">b</td>');
    expect(out).toContain('<td align="right">c</td>');
  });

  it("sets no alignment for a column with no colons", () => {
    expect(out).toContain("<th>Default</th>");
    expect(out).toContain("<td>d</td>");
  });
});

describe("table guide: cells", () => {
  it("treats an escaped pipe as text, also inside inline code", () => {
    const out = html("| Expression | Meaning |", "| --- | --- |", "| a \\| b | a or b |", "| `a \\| b` | the same, as code |");
    expect(cells(out, "td")).toEqual(["a | b", "a or b", "<code>a | b</code>", "the same, as code"]);
  });

  it("splits a cell at an unescaped pipe, even inside backticks", () => {
    const out = html("| Expression | Meaning |", "| --- | --- |", "| `a | b` | or |");
    expect(cells(out, "td")).toEqual(["`a", "b`"]);
  });

  it("renders bold, italic, code, links and strikethrough in a cell", () => {
    const out = html("| Item | Notes |", "| --- | --- |", "| **Bold** | *italic* and `code` |", "| [A link](https://example.com) | ~~old~~ |");
    expect(cells(out, "td")).toEqual([
      "<strong>Bold</strong>",
      "<em>italic</em> and <code>code</code>",
      '<a href="https://example.com">A link</a>',
      "<del>old</del>",
    ]);
  });

  it("renders an image in a cell", () => {
    expect(html("| a | b |", "| --- | --- |", "| ![alt](https://example.com/i.png) | x |")).toContain('<img src="https://example.com/i.png" alt="alt">');
  });

  it("keeps a <br> for a line break inside a cell", () => {
    expect(cells(html("| a | b |", "| --- | --- |", "| first line<br>second line | x |"), "td")[0]).toBe("first line<br>second line");
  });

  it("does not turn a list in a cell into a list", () => {
    const out = html("| a | b |", "| --- | --- |", "| - item | x |");
    expect(cells(out, "td")[0]).toBe("- item");
    expect(out).not.toContain("<ul>");
  });
});

describe("table guide: rows with a different number of cells", () => {
  it("adds empty cells to a row with fewer cells", () => {
    expect(cells(html("| a | b | c |", "| --- | --- | --- |", "| 1 | 2 |"), "td")).toEqual(["1", "2", ""]);
  });

  it("ignores the extra cells of a row with more cells", () => {
    expect(cells(html("| a | b |", "| --- | --- |", "| 1 | 2 | 3 | 4 |"), "td")).toEqual(["1", "2"]);
  });

  it("does not make a table when the header and separator differ in the number of cells", () => {
    for (const lines of [
      ["| a | b |", "| --- | --- | --- |", "| 1 | 2 |"],
      ["| a | b | c |", "| --- | --- |", "| 1 | 2 | 3 |"],
    ]) {
      const out = html(...lines);
      expect(out).not.toContain("<table>");
      expect(out).toContain("<p>");
    }
  });
});

describe("table guide: why a table does not show up", () => {
  it("shows the rows as plain text with line breaks when there is no separator row", () => {
    const out = html("| a | b |", "| 1 | 2 |");
    expect(out).not.toContain("<table>");
    expect(out).toBe("<p>| a | b |<br>| 1 | 2 |</p>");
  });

  it("makes an indented table a code block", () => {
    const out = html("    | a | b |", "    | --- | --- |", "    | 1 | 2 |");
    expect(out).not.toContain("<table>");
    expect(out).toContain("<pre");
  });

  it("makes a line right after the table another row, with the other cells empty", () => {
    const out = html("| a | b |", "| --- | --- |", "| 1 | 2 |", "not a row");
    expect(cells(out, "td")).toEqual(["1", "2", "not a row", ""]);
  });

  it("ends the table at a blank line, so what follows is plain text", () => {
    const out = html("| a | b |", "| --- | --- |", "| 1 | 2 |", "", "| 3 | 4 |");
    expect(out.match(/<table>/g)).toHaveLength(1);
    expect(out).toContain("<p>| 3 | 4 |</p>");
  });

  it("also ends the table at a heading", () => {
    expect(html("| a | b |", "| --- | --- |", "| 1 | 2 |", "# Title")).toContain("<h1>Title</h1>");
  });

  it("renders a table that directly follows a line of text, with or without a blank line", () => {
    const table = ["| a | b |", "| --- | --- |", "| 1 | 2 |"];
    expect(html("Some text", ...table)).toContain("<table>");
    expect(html("Some text", "", ...table)).toContain("<table>");
  });

  it("does not render a table when the Table button glues its first line to a line of text", () => {
    const out = html("Intro line| Header | Header |", "| --- | --- |", "| Cell | Cell |");
    expect(out).not.toContain("<table>");
    expect(out).toContain("Intro line| Header | Header |");
  });

  it("renders the starter table that the Table button inserts", () => {
    expect(cells(html("| Header | Header |", "| --- | --- |", "| Cell | Cell |"), "td")).toEqual(["Cell", "Cell"]);
  });
});

describe("table guide: other GitHub-flavored Markdown", () => {
  it("renders task lists as checkboxes that cannot be clicked, for [x], [X] and [ ]", () => {
    const out = html("- [x] Write the header row", "- [ ] Add the separator row");
    expect(out).toContain('<input checked="" disabled="" type="checkbox"> Write the header row');
    expect(out).toContain('<input disabled="" type="checkbox"> Add the separator row');
    expect(html("- [X] done")).toContain('<input checked="" disabled="" type="checkbox">');
  });

  it("makes strikethrough from two tildes or one, and not from three", () => {
    expect(html("~~two~~")).toBe("<p><del>two</del></p>");
    expect(html("~one~")).toBe("<p><del>one</del></p>");
    expect(html("a ~~~three~~~")).toBe("<p>a ~~~three~~~</p>");
  });

  it("makes links from plain URLs, www. addresses, emails and angle brackets", () => {
    const out = html("https://example.com www.example.com me@example.com <https://angle.example>");
    expect(out).toContain('<a href="https://example.com">https://example.com</a>');
    expect(out).toContain('<a href="http://www.example.com">www.example.com</a>');
    expect(out).toContain('<a href="mailto:me@example.com">me@example.com</a>');
    expect(out).toContain('<a href="https://angle.example">https://angle.example</a>');
  });

  it("turns every single line break into a <br>, or two spaces, or a backslash", () => {
    expect(html("line one", "line two")).toBe("<p>line one<br>line two</p>");
    expect(html("line one  ", "line two")).toBe("<p>line one<br>line two</p>");
    expect(html("a\\", "b")).toBe("<p>a<br>b</p>");
  });
});

describe("table guide: fenced code blocks", () => {
  const samples: Record<string, string> = {
    markup: '<a href="x">t</a>', html: '<a href="x">t</a>', xml: '<a href="x">t</a>', svg: '<a href="x">t</a>', mathml: '<a href="x">t</a>',
    css: "a { color: red; }", javascript: "const a = 1;", js: "const a = 1;", typescript: "const a: number = 1;", ts: "const a: number = 1;",
    json: '{"a": 1}', bash: 'echo "hi" | grep h', shell: 'echo "hi" | grep h', sh: 'echo "hi" | grep h',
  };
  const highlighted = (lang: string, fence = "```") => html(`${fence}${lang}`, samples[lang.toLowerCase()] ?? "const a = 1;", fence).includes('class="token');

  it.each(Object.keys(samples))("highlights %s", (lang) => {
    expect(Prism.languages[lang], lang).toBeDefined();
    expect(highlighted(lang), lang).toBe(true);
  });

  it("does not care about the case of the language, or whether the fence is backticks or tildes", () => {
    expect(highlighted("JS")).toBe(true);
    expect(highlighted("Ts")).toBe(true);
    expect(highlighted("js", "~~~")).toBe(true);
  });

  it("shows other languages in a code block without colors", () => {
    for (const lang of ["python", "yaml", "sql", "jsx", "diff"]) {
      const out = html("```" + lang, "x = 1", "```");
      expect(out, lang).toContain(`<pre class="language-${lang}"><code>x = 1</code></pre>`);
    }
  });

  it("stops highlighting when there are extra words after the language", () => {
    const out = html('```ts title="a.ts"', "const a = 1;", "```");
    expect(out).not.toContain('class="token');
    expect(out).toContain("const a = 1;");
  });
});

describe("table guide: registry", () => {
  it("is linked from the Markdown Live Preview", () => {
    const guide = getGuide("make-a-table-in-markdown")!;
    expect(guide.relatedTools).toEqual(["markdown-preview"]);
    expect(getGuidesForTool("markdown-preview").map((g) => g.slug)).toContain(guide.slug);
  });
});
