import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Calendar, Clock } from "lucide-react";
import { Faq } from "@/components/shared/Faq";
import { GuideToolCta } from "@/components/shared/GuideToolCta";
import { getGuide, getRelatedGuides } from "@/lib/guides";
import { generateGuideMetadata } from "@/lib/toolMetadata";
import { guideArticleJsonLd, guideBreadcrumbJsonLd, guideFaqJsonLd, guideHowToJsonLd } from "@/lib/jsonLd";

const guide = getGuide("validate-csv-file-fix-common-errors")!;
const relatedGuides = getRelatedGuides(guide.slug);
export const metadata: Metadata = generateGuideMetadata(guide);

const codeClass = "font-mono text-[var(--fg)]";
const h2Class = "font-display text-2xl font-semibold text-[var(--fg)] mb-4";
const h3Class = "font-display text-lg font-semibold text-[var(--fg)] mt-6 mb-2";
const tableWrapClass = "mt-4 overflow-x-auto rounded-lg border border-[var(--hairline)]";
const tableClass = "w-full text-left text-[13.5px]";
const theadClass = "bg-[var(--bg-raise)] font-mono text-[11px] uppercase tracking-wider text-[var(--fg-dim)]";
const tbodyClass = "divide-y divide-[var(--hairline)]";
const thClass = "px-4 py-3";
const tdClass = "px-4 py-3 align-top";
const tdCodeClass = "px-4 py-3 align-top font-mono text-[var(--fg)] whitespace-nowrap";
const preClass =
  "mt-4 overflow-x-auto p-4 rounded-lg border border-[var(--hairline)] bg-[var(--bg-soft)] font-mono text-[12.5px] leading-[1.7] text-[var(--fg)]";
const linkClass = "text-[var(--cyan)] hover:underline";

type Row = [ReactNode, ReactNode, ReactNode];

// Columns listed in `mono` are drawn as unwrapped code; the others wrap as prose.
function Table({ heads, rows, mono = [0, 1] }: { heads: [string, string, string]; rows: Row[]; mono?: number[] }) {
  return (
    <div className={tableWrapClass}>
      <table className={tableClass}>
        <thead className={theadClass}>
          <tr>{heads.map((head) => <th key={head} className={thClass}>{head}</th>)}</tr>
        </thead>
        <tbody className={tbodyClass}>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => <td key={j} className={mono.includes(j) ? tdCodeClass : tdClass}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const C = ({ children }: { children: string }) => <code className={codeClass}>{children}</code>;
const Pre = ({ lines }: { lines: string[] }) => <pre className={preClass}>{lines.join("\n")}</pre>;

// Every file, message and conversion below is what lib/csv-utils.ts produces;
// lib/__tests__/csv-guide-examples.test.ts checks them against the tool.
const EXAMPLE = [
  "name,role,location,joined,active",
  "Ada Lovelace,Engineer,London,1843-01-01,true",
  "Grace Hopper,Admiral,New York,1944-06-01,true",
  "\"Katherine Johnson\",Mathematician,\"White Sulphur Springs, WV\",1953-06-01,false",
  "\"Margaret Hamilton\",Engineer,Boston,1960-08-01,true",
];

const QUOTING: Row[] = [
  ["Ada Lovelace", "Ada Lovelace", "Spaces are part of a field, so nothing needs quoting"],
  ["White Sulphur Springs, WV", "\"White Sulphur Springs, WV\"", "It contains a comma, which would otherwise start a new field"],
  ["Said \"hello\"", "\"Said \"\"hello\"\"\"", "It contains double quotes: wrap the field and double each quote"],
];

const DELIMITERS: Row[] = [
  ["Comma ,", "name,city", "The delimiter RFC 4180 describes, and the default when nothing else fits"],
  ["Semicolon ;", "name;city", "Used when a spreadsheet's list separator is a semicolon, which leaves the comma free for decimals such as 1,50"],
  ["Tab", "name<Tab>city", "TSV files, which separate the fields with a tab character"],
  ["Pipe |", "name|city", "A vertical bar between fields, which the validator also detects"],
];

const ERRORS: Row[] = [
  ["A row with the wrong number of columns", "Line 3 has 2 columns but the header has 3.", "Add the missing field, or remove the extra one. The row is compared with the header, so check the header line too."],
  ["A comma inside an unquoted value", "Line 2 has 3 columns but the header has 2.", "Wrap the value in double quotes."],
  ["A space before an opening quote", "Line 2 has 3 columns but the header has 2.", "Remove the space. A quote only opens a quoted field at the very start of the field."],
  ["A quote that is never closed", "A quoted field starting on line 2 is never closed. Add the missing quote.", "Add the closing quote. Until then the rest of the file is read as part of that field."],
  ["A character after a closing quote", "Unexpected \"h\" after a closing quote on line 2. Quote the field or escape the quote by doubling it.", "Double every quote that is part of the text."],
];

const WARNINGS: Row[] = [
  ["Byte-order mark", "A UTF-8 byte-order mark was found and removed.", "Nothing to fix here: the mark is stripped before the file is parsed."],
  ["Mixed line endings", "Mixed line endings (CRLF, LF, CR). The output uses one consistent ending.", "The CSV tab writes the file back with the first ending found."],
  ["Blank lines", "3 blank lines were skipped.", "They are dropped from the table and from every output."],
  ["Empty header name", "Column 2 has an empty header. It will be exported as column_2.", "Name the column. A trailing comma on the header line creates one."],
  ["Duplicate header name", "The header \"name\" appears more than once. Later copies get a numeric suffix when converting.", "Rename the duplicates. Converted, id,id becomes id and id_2."],
  ["Replacement character", "The input contains U+FFFD (the replacement character), which usually means the file was decoded with the wrong encoding.", "Re-export the file as UTF-8, or fix the characters by hand."],
  ["Control characters", "The input contains control characters (such as NUL or ESC) that are not valid in CSV text and may break other tools.", "Remove them from the source."],
];

const CONVERT_INPUT = [
  "id,name,note",
  "007,Ada,\"Said \"\"hello\"\"\"",
  "8,,plain",
  "+15551234,\"O'Neil, Pat\",x",
];

const JSON_OUT = [
  "[",
  "  {",
  "    \"id\": \"007\",",
  "    \"name\": \"Ada\",",
  "    \"note\": \"Said \\\"hello\\\"\"",
  "  },",
  "  …",
  "]",
];

const TS_OUT = ["export interface Row {", "  id: string;", "  name: string;", "  note: string;", "}"];

const YAML_OUT = [
  "- id: \"007\"",
  "  name: \"Ada\"",
  "  note: \"Said \\\"hello\\\"\"",
  "- id: \"8\"",
  "  name: \"\"",
  "  note: \"plain\"",
  "- id: \"+15551234\"",
  "  name: \"O'Neil, Pat\"",
  "  note: \"x\"",
];

const SQL_OUT = [
  "INSERT INTO `records` (`id`, `name`, `note`) VALUES ('007', 'Ada', 'Said \"hello\"');",
  "INSERT INTO `records` (`id`, `name`, `note`) VALUES (8, NULL, 'plain');",
  "INSERT INTO `records` (`id`, `name`, `note`) VALUES ('+15551234', 'O''Neil, Pat', 'x');",
];

export default function ValidateCsvGuidePage() {
  const faqData = guideFaqJsonLd(guide);
  return (
    <>
      {[guideArticleJsonLd(guide), guideHowToJsonLd(guide), guideBreadcrumbJsonLd(guide), ...(faqData ? [faqData] : [])].map((data, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      ))}
      <article className="mx-auto max-w-4xl w-full px-4 sm:px-6 pt-10 pb-20">
        <nav aria-label="Breadcrumb" className="mb-6 font-mono text-[10.5px] tracking-[0.22em] uppercase text-[var(--fg-dim)]">
          <Link href="/">Home</Link> <span aria-hidden="true">/</span> <Link href="/guides">Guides</Link> <span aria-hidden="true">/</span> <span className="text-[var(--fg)]">{guide.title}</span>
        </nav>
        <header className="mb-10 pb-8 border-b border-[var(--hairline)]">
          <div className="flex flex-wrap items-center gap-4 mb-4 text-xs font-mono text-[var(--fg-dim)]">
            <span className="inline-flex items-center gap-1.5 text-[var(--fuchsia)]"><BookOpen className="w-3 h-3" />{guide.tagline}</span>
            <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Published {guide.publishedAt}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{guide.readingTime}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[var(--fg)] leading-tight">{guide.title}</h1>
          <p className="mt-4 text-[16px] text-[var(--fg-muted)] leading-relaxed">{guide.cardDescription}</p>
          <GuideToolCta guide={guide} />
        </header>

        <div className="space-y-12 text-[15px] text-[var(--fg-muted)] leading-relaxed">
          <section>
            <p>
              <strong className="text-[var(--fg)]">A valid CSV file has one record per line, the same number of fields in every record, and double quotes around any field that contains a comma, a double quote or a line break.</strong> To check a file, paste it into the <Link href="/csv-formatter" className={linkClass}>CSV/TSV Formatter &amp; Validator</Link>: it lists the errors it finds, each with a line number, and you fix the line it names.
            </p>
            <p className="mt-4">
              A row with the wrong number of columns is usually a comma inside a value that was not quoted. The rest of this guide covers how the format works, the errors a validator reports and how to fix each one, and how to turn a CSV into JSON, YAML or SQL.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>How is a CSV file put together?</h2>
            <p>
              Each record is on its own line, the fields in a record are separated by commas, and the first line can be a header that names the columns. RFC 4180, the document that describes the format, says each line should contain the same number of fields throughout the file, that the last record may or may not end with a line break, and that spaces are part of a field and should not be ignored. This is the validator&apos;s own example: four records, five columns, and no problems found.
            </p>
            <Pre lines={EXAMPLE} />
            <p className="mt-4">
              RFC 4180 is an informational document that records what most programs do, not a strict standard, so real files vary. That is why a validator is useful: it tells you where a file departs from the common rules.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>When does a CSV field need double quotes?</h2>
            <p>
              RFC 4180 says fields containing line breaks, double quotes and commas should be enclosed in double quotes, and that a double quote inside a quoted field is written as two double quotes.
            </p>
            <Table heads={["The value", "Written in the file", "Why"]} rows={QUOTING} mono={[0, 1]} />
            <p className="mt-4">
              A line break works the same way. A quoted field can span lines, and the validator keeps the break inside the field instead of starting a new record:
            </p>
            <Pre lines={["name,note", "Ada,\"line one", "line two\"", "Grace,ok"]} />
            <p className="mt-4">That file has two records, and Ada&apos;s note is two lines long.</p>
            <h3 className={h3Class}>Quotes only count at the start of a field</h3>
            <p>
              The validator treats a double quote as the start of a quoted field only when it is the first character of the field. In <C>{"Ada,5\" display"}</C> the quote is plain text, so the field is <C>{"5\" display"}</C> and there is no error. RFC 4180 says double quotes may not appear inside an unquoted field, so other programs may reject that file. For the same reason, a space before the opening quote, as in <C>{"Katherine, \"White Sulphur Springs, WV\""}</C>, means the field is not quoted at all, and its comma splits it into a third column.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>Which delimiter does my file use?</h2>
            <p>
              The comma is the delimiter RFC 4180 describes, but files use others too, and a file read with the wrong delimiter is not reported as an error: it becomes one wide column. Read with a comma, <C>{"name;city"}</C> followed by <C>{"Ada;London"}</C> is a table with a single column named <C>name;city</C>. If your table is one column, pick the delimiter yourself.
            </p>
            <Table heads={["Delimiter", "Example", "Where you see it"]} rows={DELIMITERS} mono={[0, 1]} />
            <p className="mt-4">
              Spreadsheets take the delimiter from a regional setting. Microsoft says the default list separator Excel uses for a CSV file is a comma, that you can change it in the Windows Region settings, and that changing the decimal separator to a comma forces Excel to use a semicolon as the list separator. So a file saved with one setting can open as a single column where another is in use.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>What errors does a CSV validator report, and how do I fix them?</h2>
            <p>
              The validator reports two kinds of problem. <strong className="text-[var(--fg)]">Errors</strong> mean the file does not read as a table, and each comes with the line it starts on. This is what you will see for the most common ones:
            </p>
            <Table heads={["Problem", "What the validator says", "How to fix it"]} rows={ERRORS} mono={[]} />
            <p className="mt-4">
              Take a file where one person has no city and another has an extra value:
            </p>
            <Pre lines={["name,email,city", "Ada,ada@example.com,London", "Grace,grace@example.com", "Linus,linus@example.com,Helsinki,Finland"]} />
            <p className="mt-4">
              The validator reports <C>Line 3 has 2 columns but the header has 3.</C> and <C>Line 4 has 4 columns but the header has 3.</C> Add an empty field to Grace&apos;s line (<C>grace@example.com,</C>) and decide what <C>Finland</C> belongs to on Linus&apos;s.
            </p>
            <h3 className={h3Class}>One stray quote can give two errors</h3>
            <p>
              A quote that is followed by text is reported on its own. Each of the two inner quotes in <C>{"\"She said \"hi\" to him\""}</C> is followed by something other than a delimiter or a line end, so you get an error for the <C>h</C> and another for the space after <C>hi</C>. Double the inner quotes, <C>{"\"She said \"\"hi\"\" to him\""}</C>, and both go away.
            </p>
            <p className="mt-4">
              If a quote is never closed, everything after it, line breaks included, is read as part of that one field. A file with an opening quote on line 2 can therefore shrink to a single record, so fix the first error before you trust the row count.
            </p>
            <h3 className={h3Class}>Warnings</h3>
            <p>
              <strong className="text-[var(--fg)]">Warnings</strong> do not stop the file from being read. They point at things that can still cause trouble in other tools. A warning about the whole file is shown against line 1.
            </p>
            <Table heads={["Warning", "What the validator says", "What to do"]} rows={WARNINGS} mono={[]} />
          </section>

          <section>
            <h2 className={h2Class}>What are line endings and the byte-order mark?</h2>
            <p>
              RFC 4180 separates records with CRLF, a carriage return followed by a line feed, but notes that some implementations use other values. The validator reads LF, CRLF and lone CR, shows the ending it found in the stats bar, and warns when a file mixes them.
            </p>
            <p className="mt-4">
              A byte-order mark is the character U+FEFF at the very start of a file, which is the three bytes EF BB BF in UTF-8. The Unicode FAQ says it is not required for UTF-8, only a signature that can help identify the encoding, and that some recipients do not expect it. In a CSV file the mark sits in front of the first header name, so the validator removes it, with a warning, before it reads the header.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>How do I convert a CSV to JSON, YAML or SQL?</h2>
            <p>
              Paste the CSV and open the tab you want. These conversions use the same small file, with a leading-zero ID, an empty cell, a quote inside a field and a comma inside a field:
            </p>
            <Pre lines={CONVERT_INPUT} />
            <h3 className={h3Class}>JSON</h3>
            <p>An array of objects, one per row, keyed by the header names. Every value is a string, because a CSV file holds only text: <C>007</C> stays <C>&quot;007&quot;</C> and does not become the number 7.</p>
            <Pre lines={JSON_OUT} />
            <h3 className={h3Class}>TypeScript</h3>
            <p>An interface for those objects. Because every JSON value is a string, every field is typed <C>string</C>.</p>
            <Pre lines={TS_OUT} />
            <h3 className={h3Class}>YAML</h3>
            <p>A list of mappings. Values are kept as quoted strings.</p>
            <Pre lines={YAML_OUT} />
            <h3 className={h3Class}>SQL</h3>
            <p>One <C>INSERT</C> per row, with backtick-quoted table and column names (the table is called <C>records</C> unless you rename it). An empty cell becomes <C>NULL</C>, a plain number such as <C>8</C> is left unquoted, and a value that would change as a number, like <C>007</C> or <C>+15551234</C>, keeps its quotes. A single quote inside a value is doubled.</p>
            <Pre lines={SQL_OUT} />
            <p className="mt-4">
              The two remaining tabs are <strong className="text-[var(--fg)]">CSV</strong>, which writes the table back with the same delimiter and line ending and quotes only the fields that need it, and <strong className="text-[var(--fg)]">Aligned</strong>, a padded plain-text table. An empty or duplicate header name is exported as <C>column_N</C> or with a numeric suffix, so the keys in every conversion are unique.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>What is specific to the CSV/TSV Formatter &amp; Validator?</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You can <strong className="text-[var(--fg)]">paste</strong> text, <strong className="text-[var(--fg)]">upload a file of up to 10 MB</strong>, or load the example.</li>
              <li>The delimiter is <strong className="text-[var(--fg)]">detected on its own</strong>: comma, semicolon, tab or pipe, whichever splits the first records into the widest, most consistent table, with ties going to comma, then semicolon, tab and pipe. You can also pick one.</li>
              <li>With <strong className="text-[var(--fg)]">First row is the header</strong> turned off, the columns are named <C>column_1</C>, <C>column_2</C> and so on.</li>
              <li>Errors with line numbers: a character after a closing quote, a quote that is never closed, and rows with a different number of columns from the header. At most 25 of those row errors are listed, followed by a count of the rest, and the page shows the first six issues and a count of the others.</li>
              <li>The Table tab shows the first 200 rows. The other tabs convert every row, each with Copy and Download.</li>
              <li>Everything is parsed in your browser, and nothing you paste or upload is sent anywhere.</li>
            </ul>
          </section>

          <section>
            <h2 className={h2Class}>Try the CSV/TSV Formatter &amp; Validator</h2>
            <p>
              Open the <Link href="/csv-formatter" className={linkClass}>CSV/TSV Formatter &amp; Validator</Link>, press Load example, then break it: remove a field from one row, or take the quotes off <C>White Sulphur Springs, WV</C>, and watch the error and its line number appear.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>How to validate a CSV file</h2>
            <div className="space-y-4">{guide.steps.map((step, i) => <div key={step.name} id={`step-${i + 1}`} className="p-5 rounded-lg border border-[var(--hairline)] bg-[var(--bg-raise)] scroll-mt-20"><h3 className="font-display text-lg font-semibold text-[var(--fg)] mb-2">{i + 1}. {step.name}</h3><p>{step.text}</p></div>)}</div>
          </section>

          {guide.faqs && <section className="pt-6 border-t border-[var(--hairline)]"><h2 className="font-mono text-[11px] tracking-[0.22em] uppercase text-[var(--fg-dim)] mb-6">{"// Frequently Asked Questions"}</h2><div className="grid gap-4">{guide.faqs.map((f) => <Faq key={f.q} q={f.q} a={f.a} />)}</div></section>}
          <section className="pt-6 border-t border-[var(--hairline)]"><div className="font-mono text-[11px] tracking-[0.22em] uppercase text-[var(--fg-dim)] mb-3">Keep reading</div><div className="flex flex-wrap gap-3">{relatedGuides.map((related) => <Link key={related.slug} href={related.path} className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--cyan)] hover:underline">{related.title} <ArrowRight className="w-3.5 h-3.5" /></Link>)}</div></section>
        </div>
      </article>
    </>
  );
}
