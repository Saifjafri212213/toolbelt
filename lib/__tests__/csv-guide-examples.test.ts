import { describe, it, expect } from "vitest";
import {
  SAMPLE_CSV,
  csvToJson,
  csvToSql,
  csvToTypeScript,
  csvToYaml,
  detectDelimiter,
  formatCsv,
  parseCsv,
  prettifyCsv,
} from "../csv-utils";
import { getGuide } from "../guides";

// Every file, message and conversion printed in
// /guides/validate-csv-file-fix-common-errors is run through the CSV tool's own
// functions here, so the guide cannot drift from what the tool does.

const messages = (text: string, options?: Parameters<typeof parseCsv>[1]) =>
  parseCsv(text, options).issues.map((issue) => issue.message);

describe("csv guide: how a CSV file is put together", () => {
  it("uses the validator's own example, with four records, five columns and no problems", () => {
    const example = [
      "name,role,location,joined,active",
      "Ada Lovelace,Engineer,London,1843-01-01,true",
      "Grace Hopper,Admiral,New York,1944-06-01,true",
      '"Katherine Johnson",Mathematician,"White Sulphur Springs, WV",1953-06-01,false',
      '"Margaret Hamilton",Engineer,Boston,1960-08-01,true',
    ].join("\n");
    expect(example).toBe(SAMPLE_CSV);
    const parsed = parseCsv(example);
    expect(parsed).toMatchObject({ rowCount: 4, columnCount: 5, delimiter: "," });
    expect(parsed.issues).toEqual([]);
  });
});

describe("csv guide: when a field needs double quotes", () => {
  const written = (value: string) => formatCsv(["v"], [[value]]).split("\n")[1];

  it("quotes commas, doubles quotes and leaves spaces alone", () => {
    expect(written("Ada Lovelace")).toBe("Ada Lovelace");
    expect(written("White Sulphur Springs, WV")).toBe('"White Sulphur Springs, WV"');
    expect(written('Said "hello"')).toBe('"Said ""hello"""');
  });

  it("reads those written forms back to the original values", () => {
    const parsed = parseCsv('v\n"White Sulphur Springs, WV"\n"Said ""hello"""\nAda Lovelace');
    expect(parsed.rows).toEqual([["White Sulphur Springs, WV"], ['Said "hello"'], ["Ada Lovelace"]]);
  });

  it("keeps a line break inside a quoted field", () => {
    const parsed = parseCsv('name,note\nAda,"line one\nline two"\nGrace,ok');
    expect(parsed.rowCount).toBe(2);
    expect(parsed.rows[0]).toEqual(["Ada", "line one\nline two"]);
    expect(parsed.issues).toEqual([]);
  });

  it("closes a quoted field at the end of a CRLF or CR line", () => {
    for (const ending of ["\r\n", "\r"]) {
      const parsed = parseCsv(`name,note${ending}Ada,"hello"${ending}Grace,"bye"${ending}`);
      expect(parsed.issues).toEqual([]);
      expect(parsed.rows).toEqual([["Ada", "hello"], ["Grace", "bye"]]);
    }
  });

  it("treats a quote inside an unquoted field as text", () => {
    const parsed = parseCsv('name,screen\nAda,5" display');
    expect(parsed.rows).toEqual([["Ada", '5" display']]);
    expect(parsed.issues).toEqual([]);
  });

  it("does not open a quoted field after a space", () => {
    const parsed = parseCsv('name,location\nKatherine, "White Sulphur Springs, WV"');
    expect(parsed.rows[0]).toHaveLength(3);
    expect(messages('name,location\nKatherine, "White Sulphur Springs, WV"')).toEqual([
      "Line 2 has 3 columns but the header has 2.",
    ]);
  });
});

describe("csv guide: delimiters", () => {
  it("detects semicolon, tab and pipe files", () => {
    expect(parseCsv("name;city\nAda;London").delimiter).toBe(";");
    expect(parseCsv("name\tcity\nAda\tLondon").delimiter).toBe("\t");
    expect(parseCsv("name|city\nAda|London").delimiter).toBe("|");
  });

  it("reads a semicolon file with a comma as one wide column and no error", () => {
    const parsed = parseCsv("name;city\nAda;London\nGrace;Paris", { delimiter: "," });
    expect(parsed.columnCount).toBe(1);
    expect(parsed.header).toEqual(["name;city"]);
    expect(parsed.rows[0]).toEqual(["Ada;London"]);
    expect(parsed.issues).toEqual([]);
  });

  it("keeps a decimal comma inside a semicolon file", () => {
    const parsed = parseCsv("item;price\nTea;1,50\nCoffee;2,25");
    expect(parsed.delimiter).toBe(";");
    expect(parsed.rows).toEqual([["Tea", "1,50"], ["Coffee", "2,25"]]);
  });

  it("breaks a tie in favour of comma, then semicolon, tab and pipe", () => {
    expect(detectDelimiter("a,b;c\td|e\n1,2;3\t4|5")).toBe(",");
    expect(detectDelimiter("a;b\tc|d\n1;2\t3|4")).toBe(";");
    expect(detectDelimiter("a\tb|c\n1\t2|3")).toBe("\t");
    expect(detectDelimiter("a|b\n1|2")).toBe("|");
  });
});

describe("csv guide: errors", () => {
  it("reports rows with the wrong number of columns, with line numbers", () => {
    const file = [
      "name,email,city",
      "Ada,ada@example.com,London",
      "Grace,grace@example.com",
      "Linus,linus@example.com,Helsinki,Finland",
    ].join("\n");
    expect(messages(file)).toEqual([
      "Line 3 has 2 columns but the header has 3.",
      "Line 4 has 4 columns but the header has 3.",
    ]);
    expect(parseCsv(file).errors.map((issue) => issue.line)).toEqual([3, 4]);
  });

  it("reports an unquoted comma as an extra column, and quoting fixes it", () => {
    expect(messages("name,location\nKatherine,White Sulphur Springs, WV")).toEqual([
      "Line 2 has 3 columns but the header has 2.",
    ]);
    expect(messages('name,location\nKatherine,"White Sulphur Springs, WV"')).toEqual([]);
  });

  it("reports a quote that is never closed and swallows the rest of the file", () => {
    const parsed = parseCsv('name,note\nAda,"first program\nGrace,compiler');
    expect(parsed.issues.map((issue) => issue.message)).toEqual([
      "A quoted field starting on line 2 is never closed. Add the missing quote.",
    ]);
    expect(parsed.rowCount).toBe(1);
  });

  it("reports a character after a closing quote once for each inner quote, and doubling fixes it", () => {
    const bad = 'name,note\nAda,"She said "hi" to him"\nGrace,ok';
    expect(messages(bad)).toEqual([
      'Unexpected "h" after a closing quote on line 2. Quote the field or escape the quote by doubling it.',
      'Unexpected " " after a closing quote on line 2. Quote the field or escape the quote by doubling it.',
    ]);
    const fixed = 'name,note\nAda,"She said ""hi"" to him"\nGrace,ok';
    expect(messages(fixed)).toEqual([]);
    expect(parseCsv(fixed).rows[0]).toEqual(["Ada", 'She said "hi" to him']);
  });

  it("lists at most 25 row errors and counts the rest", () => {
    const file = ["a,b,c", ...Array.from({ length: 30 }, (_, i) => `r${i},x`)].join("\n");
    const issues = parseCsv(file).issues;
    expect(issues.filter((issue) => issue.code === "row-length")).toHaveLength(25);
    expect(issues[issues.length - 1].message).toBe("…and 5 more rows with the wrong number of columns.");
    expect(issues).toHaveLength(26);
  });
});

describe("csv guide: warnings", () => {
  it("warns about and removes a byte-order mark", () => {
    const parsed = parseCsv("﻿name,city\nAda,London");
    expect(parsed.header).toEqual(["name", "city"]);
    expect(parsed.warnings.map((issue) => issue.message)).toEqual([
      "A UTF-8 byte-order mark was found and removed.",
    ]);
    expect("﻿".codePointAt(0)).toBe(0xfeff);
    expect([...new TextEncoder().encode("﻿")]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("warns about mixed line endings and writes the first ending back", () => {
    const parsed = parseCsv("name,city\r\nAda,London\nGrace,Paris\rLinus,Helsinki");
    expect(parsed.warnings.map((issue) => issue.message)).toEqual([
      "Mixed line endings (CRLF, LF, CR). The output uses one consistent ending.",
    ]);
    const out = formatCsv(parsed.header, parsed.rows, { delimiter: parsed.delimiter, lineEnding: parsed.lineEnding });
    expect(out).toBe("name,city\r\nAda,London\r\nGrace,Paris\r\nLinus,Helsinki");
  });

  it("reads LF, CRLF and CR files", () => {
    expect(parseCsv("a,b\n1,2").lineEnding).toBe("\n");
    expect(parseCsv("a,b\r\n1,2").lineEnding).toBe("\r\n");
    expect(parseCsv("a,b\r1,2").lineEnding).toBe("\r");
  });

  it("skips blank lines with a warning", () => {
    const parsed = parseCsv("name,city\n\nAda,London\n\n\nGrace,Paris\n");
    expect(parsed.rows).toEqual([["Ada", "London"], ["Grace", "Paris"]]);
    expect(parsed.warnings.map((issue) => issue.message)).toEqual(["3 blank lines were skipped."]);
  });

  it("warns about an empty header name, including one made by a trailing comma", () => {
    expect(messages("name,,city\nAda,x,London")).toEqual([
      "Column 2 has an empty header. It will be exported as column_2.",
    ]);
    expect(messages("a,b,\n1,2,")).toEqual(["Column 3 has an empty header. It will be exported as column_3."]);
  });

  it("warns about duplicate headers, and conversions suffix them", () => {
    expect(messages("name,city,name\nAda,London,Lovelace")).toEqual([
      'The header "name" appears more than once. Later copies get a numeric suffix when converting.',
    ]);
    const parsed = parseCsv("id,id,\n1,2,3");
    expect(csvToJson(parsed.header, parsed.rows)).toEqual([{ id: "1", id_2: "2", column_3: "3" }]);
  });

  it("warns about the replacement character and control characters", () => {
    expect(messages("name,city\nAda,Lond�n")).toEqual([
      "The input contains U+FFFD (the replacement character), which usually means the file was decoded with the wrong encoding.",
    ]);
    expect(messages("name,city\nAda,Lon\u0000don")).toEqual([
      "The input contains control characters (such as NUL or ESC) that are not valid in CSV text and may break other tools.",
    ]);
  });

  it("puts whole-file warnings on line 1", () => {
    expect(parseCsv("﻿name,city\nAda,London").warnings[0].line).toBe(1);
    expect(parseCsv("name,city\n\nAda,London").warnings[0].line).toBe(1);
  });
});

describe("csv guide: header toggle", () => {
  it("names the columns column_1, column_2 when the first row is not a header", () => {
    const parsed = parseCsv("Ada,London\nGrace,Paris", { hasHeader: false });
    expect(parsed.header).toEqual(["column_1", "column_2"]);
    expect(parsed.rowCount).toBe(2);
  });
});

describe("csv guide: conversions", () => {
  const input = ["id,name,note", '007,Ada,"Said ""hello"""', "8,,plain", "+15551234,\"O'Neil, Pat\",x"].join("\n");
  const parsed = parseCsv(input);

  it("reads the conversion example without problems", () => {
    expect(parsed.issues).toEqual([]);
    expect(parsed.rows).toEqual([
      ["007", "Ada", 'Said "hello"'],
      ["8", "", "plain"],
      ["+15551234", "O'Neil, Pat", "x"],
    ]);
  });

  it("converts to JSON with every value a string", () => {
    const json = JSON.stringify(csvToJson(parsed.header, parsed.rows), null, 2).split("\n");
    expect(json.slice(0, 6)).toEqual([
      "[",
      "  {",
      '    "id": "007",',
      '    "name": "Ada",',
      '    "note": "Said \\"hello\\""',
      "  },",
    ]);
    for (const record of csvToJson(parsed.header, parsed.rows)) {
      for (const value of Object.values(record)) expect(typeof value).toBe("string");
    }
  });

  it("converts to a TypeScript interface of strings", () => {
    expect(csvToTypeScript(parsed.header)).toBe(
      ["export interface Row {", "  id: string;", "  name: string;", "  note: string;", "}"].join("\n"),
    );
  });

  it("converts to YAML with quoted strings", () => {
    expect(csvToYaml(parsed.header, parsed.rows)).toBe(
      [
        '- id: "007"',
        '  name: "Ada"',
        '  note: "Said \\"hello\\""',
        '- id: "8"',
        '  name: ""',
        '  note: "plain"',
        '- id: "+15551234"',
        "  name: \"O'Neil, Pat\"",
        '  note: "x"',
      ].join("\n"),
    );
  });

  it("converts to SQL with NULLs, bare plain numbers and quoted look-alikes", () => {
    expect(csvToSql(parsed.header, parsed.rows)).toBe(
      [
        "INSERT INTO `records` (`id`, `name`, `note`) VALUES ('007', 'Ada', 'Said \"hello\"');",
        "INSERT INTO `records` (`id`, `name`, `note`) VALUES (8, NULL, 'plain');",
        "INSERT INTO `records` (`id`, `name`, `note`) VALUES ('+15551234', 'O''Neil, Pat', 'x');",
      ].join("\n"),
    );
  });

  it("writes CSV back with only the needed quotes, and an aligned table", () => {
    expect(formatCsv(parsed.header, parsed.rows)).toBe(
      ["id,name,note", '007,Ada,"Said ""hello"""', "8,,plain", "+15551234,\"O'Neil, Pat\",x"].join("\n"),
    );
    const sample = parseCsv(SAMPLE_CSV);
    expect(formatCsv(sample.header, sample.rows).split("\n")[3]).toBe(
      'Katherine Johnson,Mathematician,"White Sulphur Springs, WV",1953-06-01,false',
    );
    expect(prettifyCsv(parsed.header, parsed.rows).split("\n")[0]).toBe("id        | name        | note");
  });
});

describe("csv guide: registry entry", () => {
  const guide = getGuide("validate-csv-file-fix-common-errors")!;

  it("exists and points at the CSV formatter", () => {
    expect(guide).toBeDefined();
    expect(guide.relatedTools).toContain("csv-formatter");
    expect(guide.publishedAt).toBe("2026-10-28");
  });

  it("FAQ examples match the tool's output", () => {
    const text = JSON.stringify(guide.faqs);
    expect(text).toContain("Line 2 has 3 columns but the header has 2");
    expect(messages("name,location\nKatherine,White Sulphur Springs, WV")[0]).toBe(
      "Line 2 has 3 columns but the header has 2.",
    );
    expect(formatCsv(["v"], [['Said "hello"']]).split("\n")[1]).toBe('"Said ""hello"""');
    const json = csvToJson(["id"], [["007"]]);
    expect(json).toEqual([{ id: "007" }]);
  });
});
