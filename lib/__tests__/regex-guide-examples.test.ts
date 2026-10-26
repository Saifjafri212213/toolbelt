import { describe, expect, it } from "vitest";
import { getGuide, getGuidesForTool } from "../guides";
import { getTool } from "../tools";
import { compileRegex, findMatches, replacePreview } from "../regex-utils";

// Every example in the "How to Test a Regular Expression in JavaScript" guide, run through the
// Regex Tester's own functions, so the guide cannot drift from what the tool does.

function regex(pattern: string, flags = "") {
  const compiled = compileRegex(pattern, flags);
  if (!compiled.ok) throw new Error(compiled.error);
  return compiled.regex;
}
const found = (pattern: string, flags: string, text: string) => findMatches(regex(pattern, flags), text).matches;
const texts = (pattern: string, flags: string, text: string) => found(pattern, flags, text).map((m) => m.text);
const replaced = (pattern: string, flags: string, text: string, replacement: string) =>
  replacePreview(regex(pattern, flags), text, replacement);

describe("regex guide: flags", () => {
  it("g finds every match, not just the first", () => {
    expect(texts("\\d+", "", "a1 b22 c333")).toEqual(["1"]);
    expect(texts("\\d+", "g", "a1 b22 c333")).toEqual(["1", "22", "333"]);
  });

  it("i ignores case", () => {
    expect(texts("hello", "", "Hello hello HELLO")).toEqual(["hello"]);
    expect(texts("hello", "i", "Hello hello HELLO")).toEqual(["Hello"]);
  });

  it("m makes ^ match at every line", () => {
    expect(texts("^\\w+", "g", "one\ntwo\nthree")).toEqual(["one"]);
    expect(texts("^\\w+", "gm", "one\ntwo\nthree")).toEqual(["one", "two", "three"]);
  });

  it("s lets the dot match a line break", () => {
    expect(texts("a.b", "", "a\nb")).toEqual([]);
    expect(texts("a.b", "s", "a\nb")).toEqual(["a\nb"]);
  });

  it("u reads code points and allows \\p{...}", () => {
    expect(texts("\\p{L}+", "g", "héllo wörld 123")).toEqual([]);
    expect(texts("\\p{L}+", "gu", "héllo wörld 123")).toEqual(["héllo", "wörld"]);
    expect(texts(".", "g", "a😀")).toHaveLength(3);
    expect(texts(".", "gu", "a😀")).toEqual(["a", "😀"]);
  });

  it("y only matches where the search position is", () => {
    expect(texts("\\d+", "y", "123 456")).toEqual(["123"]);
    expect(texts("\\d+", "y", "x123")).toEqual([]);
    expect(texts("\\d+", "gy", "123 456")).toEqual(["123"]);
  });

  it("d and v are valid JavaScript flags too", () => {
    expect(compileRegex("a", "d").ok).toBe(true);
    expect(compileRegex("a", "v").ok).toBe(true);
  });
});

describe("regex guide: capture groups", () => {
  const sample = "Released on 2026-10-01, patched on 2026-10-14.";

  it("the tester's opening example finds two matches with year as group 1", () => {
    const matches = found("(?<year>\\d{4})-(\\d{2})-(\\d{2})", "g", sample);
    expect(matches.map((m) => m.text)).toEqual(["2026-10-01", "2026-10-14"]);
    expect(matches[0].groups).toEqual(["2026", "10", "01"]);
    expect(matches[0].named).toEqual({ year: "2026" });
    expect(replaced("(?<year>\\d{4})-(\\d{2})-(\\d{2})", "g", sample, "$3/$2/$<year>")).toBe(
      "Released on 01/10/2026, patched on 14/10/2026.",
    );
  });

  it("a non-capturing group takes no number, and a group that did not take part is undefined", () => {
    expect(found("(?:a)(b)", "", "ab")[0].groups).toEqual(["b"]);
    expect(found("(a)(b)?c", "", "ac")[0].groups).toEqual(["a", undefined]);
  });

  it("\\k<name> matches the same text again", () => {
    expect(texts("(?<title>\\w+), yes \\k<title>", "", "Do you copy? Sir, yes Sir!")).toEqual(["Sir, yes Sir"]);
  });
});

describe("regex guide: replacement codes", () => {
  it.each([
    ["(\\w+) (\\w+)", "", "John Smith", "$2, $1", "Smith, John"],
    ["(?<first>\\w+) (?<last>\\w+)", "", "John Smith", "$<last> $<first>", "Smith John"],
    ["(\\w+) (\\w+)", "", "John Smith", "$&!", "John Smith!"],
    ["\\d+", "", "a1b", "[$`|$&|$']", "a[a|1|b]b"],
    ["\\d+", "", "price 5", "$$$&", "price $5"],
  ])("%s on %j with %j gives %j", (pattern, flags, text, replacement, expected) => {
    expect(replaced(pattern, flags, text, replacement)).toBe(expected);
  });

  it("replaces only the first match without g", () => {
    expect(replaced("\\d+", "", "a1 b22 c333", "#")).toBe("a# b22 c333");
    expect(replaced("\\d+", "g", "a1 b22 c333", "#")).toBe("a# b# c#");
  });

  it("keeps a code that points at a group that does not exist", () => {
    expect(replaced("(\\w+) (\\w+)", "", "John Smith", "$3")).toBe("$3");
    expect(replaced("(\\w+) (\\w+)", "", "John Smith", "$<first>")).toBe("$<first>");
  });

  it("turns a group that did not match into an empty string", () => {
    expect(replaced("(a)|(b)", "g", "ab", "[$1][$2]")).toBe("[a][][][b]");
  });

  it("reads $10 as group 1 and a 0 when there are fewer than ten groups", () => {
    expect(replaced("(\\w+)", "", "John", "$10")).toBe("John0");
  });
});

describe("regex guide: empty matches", () => {
  it("a* on baaac finds four matches, three of them empty", () => {
    expect(found("a*", "g", "baaac").map((m) => [m.text, m.index, m.end])).toEqual([
      ["", 0, 0],
      ["aaa", 1, 4],
      ["", 4, 4],
      ["", 5, 5],
    ]);
    expect(replaced("a*", "g", "baaac", "X")).toBe("XbXXcX");
  });

  it("steps past an empty match by a code unit, or by a whole character with u", () => {
    expect(found("a*", "g", "😀").map((m) => m.index)).toEqual([0, 1, 2]);
    expect(found("a*", "gu", "😀").map((m) => m.index)).toEqual([0, 2]);
  });
});

describe("regex guide: escaping", () => {
  it("an unescaped 1+1=2? does not match 1+1=2, and the escaped pattern does", () => {
    expect(texts("1+1=2?", "", "1+1=2")).toEqual([]);
    expect(texts("1+1=2?", "", "11=2")).toEqual(["11=2"]);
    expect(texts("1\\+1=2\\?", "", "is 1+1=2? yes")).toEqual(["1+1=2?"]);
  });

  it("the escape helper in the guide escapes every special character", () => {
    const escapeRegExp = (text: string) => text.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
    const special = "a.b*c(d)[e]{f}|g^h$i\\j+k?";
    expect(escapeRegExp("1+1=2?")).toBe("1\\+1=2\\?");
    expect(new RegExp(escapeRegExp(special)).test(special)).toBe(true);
  });

  it("with u, escaping a character that is not special is an error the tester reports", () => {
    for (const pattern of ["\\a", "\\-"]) {
      const result = compileRegex(pattern, "u");
      expect(result).toEqual({ ok: false, error: "Invalid pattern: Invalid escape" });
      expect(compileRegex(pattern, "").ok).toBe(true);
    }
    expect(compileRegex("[\\-]", "u").ok).toBe(true);
  });

  it("an unterminated group is reported as the guide says", () => {
    expect(compileRegex("(", "g")).toEqual({ ok: false, error: "Invalid pattern: Unterminated group" });
  });
});

describe("regex guide: limits and links", () => {
  it("lists at most 1,000 matches and says when there are more", () => {
    const re = regex("a", "g");
    expect(findMatches(re, "a".repeat(1000))).toMatchObject({ truncated: false });
    const over = findMatches(re, "a".repeat(1001));
    expect(over.matches).toHaveLength(1000);
    expect(over.truncated).toBe(true);
  });

  it("states the same limits as the tool's own FAQ", () => {
    const guide = getGuide("test-regex-in-javascript")!;
    const tool = getTool("regex-tester")!;
    const guideText = guide.faqs!.map((faq) => faq.a).join(" ");
    const toolText = tool.faqs.map((faq) => faq.a).join(" ");
    for (const limit of ["100,000", "1,000"]) {
      expect(guideText).toContain(limit);
      expect(toolText).toContain(limit);
    }
  });

  it("is linked from the Regex Tester and links back to it", () => {
    const guide = getGuide("test-regex-in-javascript")!;
    expect(guide.relatedTools).toEqual(["regex-tester"]);
    expect(getGuidesForTool("regex-tester").map((g) => g.slug)).toContain(guide.slug);
  });
});
