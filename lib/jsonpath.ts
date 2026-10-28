import { JSONPath } from "jsonpath-plus";
import { parse as llParse } from "lossless-json";

export interface JsonPathResult {
  ok: boolean;
  matches: unknown[];
  paths: string[];
  error?: string;
}

// The value at a JSON Pointer such as `/items/0` (RFC 6901: `~1` is `/`, `~0` is `~`, and `""` is the root).
function atPointer(tree: unknown, pointer: string): unknown {
  return pointer
    .split("/")
    .slice(1)
    .reduce(
      (node, token) => (node as Record<string, unknown>)[token.replace(/~1/g, "/").replace(/~0/g, "~")],
      tree,
    );
}

// ---- Quoted names ----------------------------------------------------------------------------
// jsonpath-plus splits an expression with regular expressions, so a quoted name that holds a quote,
// a backslash, a bracket or a dot, or that reads like an operator (`*`, `..`, `^`, `~`, `$`, `a,b`,
// `1:2`, `?(...)`), is cut up or run as the operator. Names it already reads correctly are left
// exactly as they are. Any other quoted name is read the way RFC 9535 defines a string literal and
// replaced by a harmless alias that is also added, hidden, to the parsed data, so the library
// finds the real key through it.

// Names the library reads correctly when they are written without an escape.
const PLAIN_NAME = /^[A-Za-z0-9_ -]*$/;

const ESCAPES: Record<string, string> = { b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", "\\": "\\", "/": "/" };

// A string literal that starts at `start` (a quote): its value and the index after its closing quote.
// An escape RFC 9535 does not define, or a literal that never closes, is not read (null). A lone surrogate
// written as \uD800 is accepted, because that is how JSON.stringify writes a key that has one.
function readStringLiteral(expr: string, start: number): { value: string; end: number } | null {
  const quote = expr[start];
  let value = "";
  for (let i = start + 1; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === quote) return { value, end: i + 1 };
    if (ch !== "\\") {
      value += ch;
      continue;
    }
    const next = expr[++i];
    if (next === quote || (next !== undefined && Object.hasOwn(ESCAPES, next))) {
      value += next === quote ? next : ESCAPES[next];
    } else if (next === "u" && /^[0-9A-Fa-f]{4}$/.test(expr.slice(i + 1, i + 5))) {
      value += String.fromCharCode(parseInt(expr.slice(i + 1, i + 5), 16));
      i += 4;
    } else {
      return null;
    }
  }
  return null;
}

const isBlank = (ch: string | undefined) => ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
const skipBlanks = (text: string, from: number) => {
  while (isBlank(text[from])) from++;
  return from;
};

// The index after the `]` that closes the bracket opened at `start`, skipping over strings and nested brackets.
function bracketEnd(expr: string, start: number): number {
  let depth = 0;
  for (let i = start; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '"' || ch === "'") {
      for (i++; i < expr.length && expr[i] !== ch; i++) if (expr[i] === "\\") i++;
    } else if (ch === "[") {
      depth++;
    } else if (ch === "]" && --depth === 0) {
      return i + 1;
    }
  }
  return expr.length;
}

interface PreparedPath {
  expr: string;
  /** Alias token for each quoted name that needs one, in the order they were met. */
  aliases: { token: string; name: string }[];
}

// Rewrites the bracket selectors that hold exactly one quoted name; every other bracket is copied as written.
function prepareExpression(expr: string, sentinel: string): PreparedPath {
  const aliases: PreparedPath["aliases"] = [];
  let out = "";
  let i = 0;
  while (i < expr.length) {
    if (expr[i] !== "[") {
      out += expr[i++];
      continue;
    }
    const end = bracketEnd(expr, i);
    const literalStart = skipBlanks(expr, i + 1);
    const quote = expr[literalStart];
    const literal = quote === '"' || quote === "'" ? readStringLiteral(expr, literalStart) : null;
    if (!literal || skipBlanks(expr, literal.end) !== end - 1) {
      out += expr.slice(i, end);
      i = end;
      continue;
    }
    if (PLAIN_NAME.test(literal.value)) {
      // Nothing to protect, unless an escape or a space around the literal has to be read first.
      const written = expr.slice(literalStart, literal.end);
      const asWritten = expr.slice(i + 1, end - 1) === written && !written.includes("\\");
      out += asWritten ? expr.slice(i, end) : `['${literal.value}']`;
    } else {
      const token = `${sentinel}${aliases.length}${sentinel}`;
      aliases.push({ token, name: literal.value });
      out += `['${token}']`;
    }
    i = end;
  }
  return { expr: out, aliases };
}

// Adds each alias to every object that has the key it stands for. It is not enumerable, so it never shows up
// as a key (`*`, `..`, `~`, filters, `Object.keys`), and the library still finds it by name.
function addAliases(root: unknown, aliases: PreparedPath["aliases"]): void {
  const stack: unknown[] = [root];
  while (stack.length) {
    const node = stack.pop();
    if (node === null || typeof node !== "object") continue;
    if (!Array.isArray(node)) {
      for (const { token, name } of aliases) {
        if (Object.hasOwn(node, name)) {
          Object.defineProperty(node, token, {
            value: (node as Record<string, unknown>)[name],
            enumerable: false,
            configurable: true,
            writable: true,
          });
        }
      }
    }
    for (const child of Object.values(node)) stack.push(child);
  }
}

// A private-use character that is in neither the expression nor the JSON text, so an alias can never be
// mistaken for a key or a value (a private-use character in the data is either written as itself or as \uXXXX).
function pickSentinel(raw: string, path: string): string | null {
  const lower = raw.toLowerCase();
  for (let code = 0xe000; code <= 0xe0ff; code++) {
    const ch = String.fromCharCode(code);
    const escaped = `\\u${code.toString(16)}`;
    if (!raw.includes(ch) && !path.includes(ch) && !lower.includes(escaped)) return ch;
  }
  return null;
}

const escapePointerToken = (name: string) => name.replace(/~/g, "~0").replace(/\//g, "~1");

export function runJsonPath(raw: string, path: string): JsonPathResult {
  if (!raw.trim()) return { ok: false, matches: [], paths: [], error: "Paste JSON first" };
  if (!path.trim()) return { ok: false, matches: [], paths: [], error: "Enter a JSONPath expression" };
  let parsed: unknown;
  // Lossless copy of the same input, so matched numbers keep every digit. The expression still runs on `parsed`:
  // jsonpath-plus would walk into a LosslessNumber's own fields, and filters would stop matching numbers.
  let lossless: unknown;
  try {
    parsed = JSON.parse(raw);
    lossless = llParse(raw);
  } catch (e) {
    return { ok: false, matches: [], paths: [], error: `Invalid JSON: ${e instanceof Error ? e.message : "parse error"}` };
  }
  try {
    const sentinel = pickSentinel(raw, path);
    const prepared = sentinel ? prepareExpression(path, sentinel) : { expr: path, aliases: [] };
    if (prepared.aliases.length) addAliases(parsed, prepared.aliases);
    // Where a result names an alias, put the real key back.
    const names = new Map(prepared.aliases.map((a) => [a.token, a.name]));
    const aliasToken = sentinel ? new RegExp(`${sentinel}\\d+${sentinel}`, "g") : null;
    const unalias = (text: string, escape = (name: string) => name) =>
      aliasToken && names.size ? text.replace(aliasToken, (token) => escape(names.get(token) ?? token)) : text;
    const result = JSONPath({
      path: prepared.expr,
      json: parsed as object,
      resultType: "all",
      wrap: true,
    }) as { value: unknown; path: string; pointer: string }[];
    return {
      ok: true,
      // A string match keeps its own value: for a property name (`$.*~`) the pointer is that property's value.
      matches: result.map((r) =>
        typeof r.value === "string" ? unalias(r.value) : atPointer(lossless, unalias(r.pointer, escapePointerToken)),
      ),
      paths: result.map((r) => unalias(r.path)),
    };
  } catch (e) {
    return {
      ok: false,
      matches: [],
      paths: [],
      error: e instanceof Error ? e.message : "JSONPath evaluation failed",
    };
  }
}
