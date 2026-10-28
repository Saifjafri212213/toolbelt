import { describe, it, expect } from "vitest";
import { LosslessNumber, stringify } from "lossless-json";
import { runJsonPath } from "../jsonpath";
import { SAMPLE_JSON } from "../json-utils";
import { buildJsonTreePath } from "../json-tree-path";

describe("runJsonPath", () => {
  it.each(["", " \t\n "])("rejects blank JSON %j", (raw) => {
    expect(runJsonPath(raw, "$..email")).toEqual({
      ok: false,
      matches: [],
      paths: [],
      error: "Paste JSON first",
    });
  });

  it.each(["", " \t\n "])("rejects a blank expression %j", (path) => {
    expect(runJsonPath(SAMPLE_JSON, path)).toEqual({
      ok: false,
      matches: [],
      paths: [],
      error: "Enter a JSONPath expression",
    });
  });

  it("reports invalid JSON without matches or paths", () => {
    expect(runJsonPath("{", "$..email")).toEqual({
      ok: false,
      matches: [],
      paths: [],
      error: expect.stringMatching(/^Invalid JSON: /),
    });
  });

  it("finds both email values with their matching paths", () => {
    expect(runJsonPath(SAMPLE_JSON, "$..email")).toEqual({
      ok: true,
      matches: ["ada@codercops.com", true],
      paths: [
        "$['user']['email']",
        "$['user']['preferences']['notifications']['email']",
      ],
    });
  });

  it("filters out inactive projects", () => {
    expect(runJsonPath(SAMPLE_JSON, "$.user.projects[?(@.active==true)]")).toEqual({
      ok: true,
      matches: [{ id: new LosslessNumber("1"), name: "Atlas", active: true }],
      paths: ["$['user']['projects'][0]"],
    });
  });

  it("keeps every digit of large integers and high-precision decimals", () => {
    const result = runJsonPath('{"a": 12345678901234567890, "b": 0.1000000000000000055511151231257827}', "$.*");
    expect(stringify(result.matches, null, 2)).toBe(
      "[\n  12345678901234567890,\n  0.1000000000000000055511151231257827\n]"
    );
  });

  it("returns nested matches once, without walking into the numbers", () => {
    expect(stringify(runJsonPath('{"a":1,"b":{"c":2}}', "$..*").matches)).toBe('[1,{"c":2},2]');
    expect(runJsonPath('{"a":5}', "$.a.value").matches).toEqual([]);
  });

  it.each(["$.items[?(@.p === 5)]", "$.items[?(@.p == @.q)]"])("filters on numbers with %s", (path) => {
    expect(stringify(runJsonPath('{"items":[{"p":5,"q":5},{"p":50,"q":1}]}', path).matches)).toBe(
      '[{"p":5,"q":5}]'
    );
  });

  it("resolves keys containing / and ~, and the root", () => {
    const raw = '{"a/b": 10000000000000000001, "c~d": {"e": 2}}';
    expect(stringify(runJsonPath(raw, '$["a/b"]').matches)).toBe("[10000000000000000001]");
    expect(stringify(runJsonPath(raw, '$["c~d"].e').matches)).toBe("[2]");
    expect(stringify(runJsonPath(raw, "$").matches)).toBe(`[${raw.replace(/ /g, "")}]`);
  });

  it("returns property names as names, not the values they point to", () => {
    expect(runJsonPath('{"a": 1, "b": 2}', "$.*~").matches).toEqual(["a", "b"]);
  });

  it("reports a duplicate key as an error instead of throwing", () => {
    expect(runJsonPath('{"a": 1, "a": 2}', "$.a")).toEqual({
      ok: false,
      matches: [],
      paths: [],
      error: "Invalid JSON: Duplicate key 'a' encountered at position 10",
    });
  });

  it("returns an empty successful result when nothing matches", () => {
    expect(runJsonPath(SAMPLE_JSON, "$.user.missing")).toEqual({
      ok: true,
      matches: [],
      paths: [],
    });
  });
});

describe("runJsonPath quoted names (RFC 9535 string literals)", () => {
  const found = (raw: string, path: string) => stringify(runJsonPath(raw, path).matches);
  const AWKWARD = '{"q\\"uote": 5, "back\\\\slash": 6, "br[ack]et": 9, "it\'s": 10, "tab\\there": 11}';

  it.each([
    ['$["q\\"uote"]', "[5]"],
    ['$["back\\\\slash"]', "[6]"],
    ['$["br[ack]et"]', "[9]"],
    ['$["it\'s"]', "[10]"],
    ['$["tab\\there"]', "[11]"],
    ["$['it\\'s']", "[10]"],
  ])("finds the value for %s", (path, expected) => {
    expect(found(AWKWARD, path)).toBe(expected);
  });

  it("keeps the paths that already worked working", () => {
    const raw = '{"a b": 1, "": 2, "q\\"uote": 5}';
    expect(found(raw, '$["a b"]')).toBe("[1]");
    expect(found(raw, "$['a b']")).toBe("[1]");
    expect(found(raw, '$[""]')).toBe("[2]");
    expect(found(raw, "$['q\"uote']")).toBe("[5]");
  });

  it("reads every escape of a string literal", () => {
    const raw = JSON.stringify({ "a/b": 1, "a\bb": 2, "a\fb": 3, "a\nb": 4, "a\rb": 5, "a\tb": 6, "a\\b": 7, "é": 8, "😀": 9 });
    expect(found(raw, '$["a\\/b"]')).toBe("[1]");
    expect(found(raw, '$["a\\bb"]')).toBe("[2]");
    expect(found(raw, '$["a\\fb"]')).toBe("[3]");
    expect(found(raw, '$["a\\nb"]')).toBe("[4]");
    expect(found(raw, '$["a\\rb"]')).toBe("[5]");
    expect(found(raw, '$["a\\tb"]')).toBe("[6]");
    expect(found(raw, '$["a\\\\b"]')).toBe("[7]");
    expect(found(raw, '$["\\u00e9"]')).toBe("[8]");
    expect(found(raw, '$["\\u00E9"]')).toBe("[8]");
    expect(found(raw, '$["\\ud83d\\ude00"]')).toBe("[9]");
  });

  it("takes [, ], . and , inside the quotes as characters", () => {
    const raw = '{"a[0]": 1, "a]": 2, "a.b": 3, "a,b": 4, "a][b": 5}';
    expect(found(raw, '$["a[0]"]')).toBe("[1]");
    expect(found(raw, '$["a]"]')).toBe("[2]");
    expect(found(raw, '$["a.b"]')).toBe("[3]");
    expect(found(raw, "$['a,b']")).toBe("[4]");
    expect(found(raw, '$["a][b"]')).toBe("[5]");
  });

  it("matches a name that looks like an operator as a name, not as the operator", () => {
    const raw = '{"*": 1, "..": 2, "^": 3, "~": 4, "$": 5, "@": 6, "1:2": 7, "?(@.x)": 8, "(1)": 9, "a": 10}';
    for (const [name, value] of [["*", 1], ["..", 2], ["^", 3], ["~", 4], ["$", 5], ["@", 6], ["1:2", 7], ["?(@.x)", 8], ["(1)", 9]] as const) {
      expect(found(raw, `$[${JSON.stringify(name)}]`)).toBe(`[${value}]`);
      expect(found(raw, `$['${name}']`)).toBe(`[${value}]`);
    }
  });

  it("finds the value for the path buildJsonTreePath writes, whatever the key", () => {
    const keys = [
      '', 'a b', 'q"uote', "it's", 'a\'b"c', "back\\slash", "\\", '\\"', "br[ack]et", "a]", "[0]", "']", '"]',
      "dot.key", "til~de", "sl/ash", "a~1b", "a~0b", "~0", "~1", "a,b", ";", "%", "$ref", "$", "@", "*", "..", "^", "~", "?(@.x)", "(1)", "1:2", "-1", "0",
      "tab\there", "new\nline", "cr\rhere", "\u0000", "\u0008", "\u001f", "\u007f", "\u2028", "\ud800", "\udc00",
      "é", "日本語", "😀", "a\u{10ffff}", "__proto__", "constructor", "length",
    ];
    const raw = JSON.stringify(Object.fromEntries(keys.map((key, i) => [key, i])), null, 1);
    // JSON.stringify drops __proto__ as an own key when built from an object, so write it by hand.
    const body = "{" + keys.map((key, i) => `${JSON.stringify(key)}: ${i}`).join(", ") + "}";
    for (const text of [body, raw]) {
      keys.forEach((key, i) => {
        const path = buildJsonTreePath([{ type: "property", key }]);
        const result = runJsonPath(text, path);
        expect({ key, path, matches: stringify(result.matches) }).toEqual({ key, path, matches: `[${i}]` });
      });
    }
  });

  it("finds a nested value through awkward keys and array indexes", () => {
    const raw = '{"it\'s": [{"a.b": {"c]": 1}}, {"a.b": {"c]": 2}}]}';
    const path = buildJsonTreePath([
      { type: "property", key: "it's" },
      { type: "index", index: 1 },
      { type: "property", key: "a.b" },
      { type: "property", key: "c]" },
    ]);
    expect(found(raw, path)).toBe("[2]");
  });

  it("finds the name through a wildcard, a recursive descent and a filter", () => {
    const raw = '[{"it\'s": 1, "x": 0}, {"it\'s": 2, "x": 0}, {"deep": {"it\'s": 3}}]';
    expect(found(raw, '$[*]["it\'s"]')).toBe("[1,2]");
    expect(found(raw, '$..["it\'s"]')).toBe("[1,2,3]");
    expect(found(raw, '$[?(@.x==0)]["it\'s"]')).toBe("[1,2]");
  });

  it("returns a property name as the name, and keeps the other lookups free of the lookup alias", () => {
    const raw = '{"it\'s": 10, "a": 1}';
    expect(runJsonPath(raw, '$["it\'s"]~').matches).toEqual(["it's"]);
    expect(runJsonPath(raw, "$.*~").matches).toEqual(["it's", "a"]);
    expect(found(raw, "$.*")).toBe("[10,1]");
    expect(found(raw, "$..*")).toBe("[10,1]");
    expect(stringify(runJsonPath(raw, '$["it\'s"]').matches)).toBe("[10]");
  });

  it("names the matched key in the result path", () => {
    expect(runJsonPath('{"it\'s": 10}', '$["it\'s"]').paths).toEqual(["$['it's']"]);
    expect(runJsonPath('{"q\\"uote": {"a": 1}}', '$["q\\"uote"].a').paths).toEqual(["$['q\"uote']['a']"]);
  });

  it("keeps large numbers exact when they are found by a quoted name", () => {
    expect(found('{"it\'s": 12345678901234567890}', '$["it\'s"]')).toBe("[12345678901234567890]");
  });

  it("does not change the data it searches: a hidden lookup never shows up as a key", () => {
    const raw = '{"it\'s": {"it\'s": 1}, "b": 2}';
    expect(found(raw, '$["it\'s"]')).toBe('[{"it\'s":1}]');
    expect(found(raw, '$["it\'s"]["it\'s"]')).toBe("[1]");
    expect(runJsonPath(raw, "$..*~").matches).toEqual(["it's", "b", "it's"]);
  });

  it("reads the blanks RFC 9535 allows inside the brackets, for plain and awkward names alike", () => {
    const raw = '{"a": 1, "it\'s": 2}';
    expect(found(raw, '$[ "a" ]')).toBe("[1]");
    expect(found(raw, "$[ 'a']")).toBe("[1]");
    expect(found(raw, '$["a" ]')).toBe("[1]");
    expect(found(raw, '$[ "it\'s" ]')).toBe("[2]");
  });

  it("reads an escape in a name that is otherwise plain", () => {
    expect(found('{"a b": 1}', '$["a\\u0020b"]')).toBe("[1]");
    expect(found('{"a\\nb": 1}', '$["a\\nb"]')).toBe("[1]");
  });

  it("follows two different awkward names in one path, and the same one twice", () => {
    const raw = '{"a.b": {"c]": {"a.b": 3}}}';
    expect(found(raw, '$["a.b"]["c]"]["a.b"]')).toBe("[3]");
    expect(found(raw, "$['a.b']['c]']")).toBe('[{"a.b":3}]');
  });

  it("is not fooled by a key that looks like the lookup it adds", () => {
    // Whatever private-use character the lookup is built from, a document that already uses one still works,
    // whether the character is written as itself or as an escape in either case.
    for (const code of ["e000", "e001", "e002"]) {
      const char = String.fromCharCode(parseInt(code, 16));
      const key = `${char}0${char}`;
      for (const written of [key, `\\u${code}0\\u${code}`, `\\u${code.toUpperCase()}0\\u${code.toUpperCase()}`]) {
        const raw = `{"it's": 1, "${written}": 2}`;
        expect(found(raw, '$["it\'s"]')).toBe("[1]");
        expect(found(raw, `$["${key}"]`)).toBe("[2]");
        // The parent, listed after the lookup ran, still has both keys, with their own values.
        expect(runJsonPath(raw, '$["it\'s"]^.*~').matches).toEqual(["it's", key]);
        expect(found(raw, '$["it\'s"]^.*')).toBe("[1,2]");
      }
    }
  });

  it("does not let the expression mention the lookup either", () => {
    const token = String.fromCharCode(0xe000) + "0" + String.fromCharCode(0xe000);
    // A filter that asks for a property named like the first lookup must not find the hidden one.
    expect(found('[{"it\'s": 1}]', `$[?(@['${token}'])]["it's"]`)).toBe("[]");
    expect(found('[{"it\'s": 1}]', `$[0]["it's"]`)).toBe("[1]");
    expect(found('{"it\'s": {"\\ue000": 5}}', `$["it's"]["${String.fromCharCode(0xe000)}"]`)).toBe("[5]");
  });

  it("returns nothing, without failing, when the data is not an object", () => {
    expect(runJsonPath("5", '$["it\'s"]')).toEqual({ ok: true, matches: [], paths: [] });
    expect(found('[{"it\'s": 1}, [{"it\'s": 2}]]', '$[0]["it\'s"]')).toBe("[1]");
    expect(found('[{"it\'s": 1}, [{"it\'s": 2}]]', '$[1][0]["it\'s"]')).toBe("[2]");
  });

  it("keeps reading a literal with an escape RFC 9535 does not define the way it always was, as the literal characters", () => {
    // \q is not an escape, and neither is \' in double quotes or \" in single quotes, so these selectors are not
    // rewritten and keep their old result: the key that has the backslash in it, or nothing, never the key
    // without the backslash.
    const raw = JSON.stringify({ a: 1, "a\\qb": 2, "it\\'s": 3, "it's": 4, 'q\\"t': 5 });
    expect(found(raw, '$["a\\qb"]')).toBe("[2]");
    expect(found(raw, '$["a"]')).toBe("[1]");
    expect(found(raw, '$["it\\\'s"]')).toBe("[]");
    expect(found(raw, "$['it\\'s']")).toBe("[4]");
    expect(found(raw, "$['q\\\"t']")).toBe("[5]");
  });

  it("does not shorten a bracket that holds more than one name", () => {
    // jsonpath-plus finds nothing for a quoted union; it must not be turned into its first name.
    const raw = '{"a": 1, "b": 2}';
    expect(found(raw, "$['a','b']")).toBe("[]");
    expect(found(raw, '$["a","b"]')).toBe("[]");
  });

  it("lists the keys of an object that has a lookup without the lookup", () => {
    const raw = '{"a.b": {"a.b": 1, "c": 2}}';
    expect(found(raw, '$["a.b"].*')).toBe("[1,2]");
    expect(runJsonPath(raw, '$["a.b"].*').paths).toEqual(["$['a.b']['a.b']", "$['a.b']['c']"]);
    expect(runJsonPath(raw, '$["a.b"].*~').matches).toEqual(["a.b", "c"]);
    expect(found(raw, '$["a.b"]..*')).toBe("[1,2]");
  });
});
