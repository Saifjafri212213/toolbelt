import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MarkdownPreviewClient } from "./MarkdownPreviewClient";

// The Table button: what it inserts, and the line breaks it adds so the table stays a table and the
// text around it stays text. (The HTML that survives sanitizing is checked in a real browser, because
// DOMPurify does not behave like it does there under happy-dom.)

const input = () => screen.getByLabelText("Markdown input") as HTMLTextAreaElement;
const type = (value: string) => fireEvent.change(input(), { target: { value } });
const clickTable = () => fireEvent.click(screen.getByRole("button", { name: "Table" }));
const cursorAt = (position: number) => {
  input().focus();
  input().setSelectionRange(position, position);
};

describe("the Table button", () => {
  // Vitest globals are off, so Testing Library does not clean up on its own.
  afterEach(cleanup);

  const starter = "| Header | Header |\n| --- | --- |\n| Cell | Cell |\n";

  it("inserts exactly the starter table in an empty editor", () => {
    render(<MarkdownPreviewClient />);
    type("");
    clickTable();
    expect(input().value).toBe(starter);
  });

  it("leaves a blank line between a line of text and the table when it is clicked at the end of the line", () => {
    render(<MarkdownPreviewClient />);
    type("Intro line");
    cursorAt("Intro line".length);
    clickTable();
    expect(input().value).toBe(`Intro line\n\n${starter}`);
  });

  it("leaves a blank line between the table and the text after it when it is clicked at the start of a line", () => {
    render(<MarkdownPreviewClient />);
    type("A\nNext");
    cursorAt(2);
    clickTable();
    expect(input().value).toBe(`A\n\n${starter}\nNext`);
  });

  it("adds a blank line before the table only when one is missing", () => {
    render(<MarkdownPreviewClient />);
    type("Intro line\n\nafter");
    cursorAt(12);
    clickTable();
    expect(input().value).toBe(`Intro line\n\n${starter}\nafter`);
  });

  it("does the same when it is clicked on the empty line itself", () => {
    render(<MarkdownPreviewClient />);
    type("Intro line\n\nafter");
    cursorAt(11);
    clickTable();
    expect(input().value).toBe(`Intro line\n\n${starter}\nafter`);
  });

  it("adds a blank line after the table when it is clicked at the very start of the text", () => {
    render(<MarkdownPreviewClient />);
    type("Next");
    cursorAt(0);
    clickTable();
    expect(input().value).toBe(`${starter}\nNext`);
  });

  it("ends a line that only has spaces or a tab, so the table starts at the margin instead of becoming code", () => {
    render(<MarkdownPreviewClient />);
    type("A\n\n    ");
    cursorAt(7);
    clickTable();
    expect(input().value).toBe(`A\n\n    \n${starter}`);
    type("A\n\n\t");
    cursorAt(4);
    clickTable();
    expect(input().value).toBe(`A\n\n\t\n${starter}`);
  });

  it("adds nothing after the table when it is clicked at the end of the text", () => {
    render(<MarkdownPreviewClient />);
    type("Intro\n");
    cursorAt(6);
    clickTable();
    expect(input().value).toBe(`Intro\n\n${starter}`);
  });
});
