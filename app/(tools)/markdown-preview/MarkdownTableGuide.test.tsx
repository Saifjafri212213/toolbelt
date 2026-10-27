import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MarkdownPreviewClient } from "./MarkdownPreviewClient";

// The claims in the "How to Make a Table in Markdown" guide about the Table button: what it inserts,
// and where. (The HTML that survives sanitizing is checked in a real browser, because DOMPurify does
// not behave like it does there under happy-dom.)

const input = () => screen.getByLabelText("Markdown input") as HTMLTextAreaElement;
const type = (value: string) => fireEvent.change(input(), { target: { value } });
const clickTable = () => fireEvent.click(screen.getByRole("button", { name: "Table" }));
const cursorAt = (position: number) => {
  input().focus();
  input().setSelectionRange(position, position);
};

describe("table guide: the Table button", () => {
  // Vitest globals are off, so Testing Library does not clean up on its own.
  afterEach(cleanup);

  const starter = "| Header | Header |\n| --- | --- |\n| Cell | Cell |\n";

  it("inserts a starter table with two columns, a header and one row", () => {
    render(<MarkdownPreviewClient />);
    type("");
    clickTable();
    expect(input().value).toBe(starter);
  });

  it("inserts right at the cursor, without adding blank lines around it", () => {
    render(<MarkdownPreviewClient />);
    type("Intro line\n\nafter");
    cursorAt(12);
    clickTable();
    expect(input().value).toBe(`Intro line\n\n${starter}after`);
  });

  it("glues the first line of the table to the text when it is clicked at the end of a line", () => {
    render(<MarkdownPreviewClient />);
    type("Intro line");
    cursorAt("Intro line".length);
    clickTable();
    expect(input().value).toBe(`Intro line${starter}`);
    expect(input().value.split("\n")[0]).toBe("Intro line| Header | Header |");
  });
});
