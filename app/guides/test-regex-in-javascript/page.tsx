import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Calendar, Clock } from "lucide-react";
import { Faq } from "@/components/shared/Faq";
import { GuideToolCta } from "@/components/shared/GuideToolCta";
import { getGuide, getRelatedGuides } from "@/lib/guides";
import { generateGuideMetadata } from "@/lib/toolMetadata";
import { guideArticleJsonLd, guideBreadcrumbJsonLd, guideFaqJsonLd, guideHowToJsonLd } from "@/lib/jsonLd";

const guide = getGuide("test-regex-in-javascript")!;
const relatedGuides = getRelatedGuides(guide.slug);
export const metadata: Metadata = generateGuideMetadata(guide);

const codeClass = "font-mono text-[var(--fg)]";
const preClass = "mt-4 p-4 rounded-lg border border-[var(--hairline)] bg-[var(--bg-soft)] font-mono text-[12.5px] whitespace-pre-wrap text-[var(--fg)]";
const h2Class = "font-display text-2xl font-semibold text-[var(--fg)] mb-4";
const tableWrapClass = "mt-4 overflow-x-auto rounded-lg border border-[var(--hairline)]";
const tableClass = "w-full text-left text-[13.5px]";
const theadClass = "bg-[var(--bg-raise)] font-mono text-[11px] uppercase tracking-wider text-[var(--fg-dim)]";
const tbodyClass = "divide-y divide-[var(--hairline)]";
const thClass = "px-4 py-3";
const tdClass = "px-4 py-3 align-top";
const tdCodeClass = "px-4 py-3 align-top font-mono text-[var(--fg)]";
const linkClass = "text-[var(--cyan)] hover:underline";

const C = ({ children }: { children: string }) => <code className={codeClass}>{children}</code>;

// The flags the Regex Tester has a switch for, with a check of each one in the tester.
const FLAGS: { flag: string; meaning: ReactNode; example: ReactNode }[] = [
  {
    flag: "g",
    meaning: "Find every match, not just the first",
    example: <><C>{"\\d+"}</C> on <C>{"a1 b22 c333"}</C> finds 1 match without <C>g</C> and 3 with it.</>,
  },
  {
    flag: "i",
    meaning: "Ignore case",
    example: <><C>hello</C> on <C>{"Hello hello HELLO"}</C> first matches <C>hello</C>; with <C>i</C> the first match is <C>Hello</C>.</>,
  },
  {
    flag: "m",
    meaning: <><C>^</C> and <C>$</C> match at every line break, not only at the ends of the text</>,
    example: <><C>{"^\\w+"}</C> with <C>g</C> on three lines (<C>one</C>, <C>two</C>, <C>three</C>) finds only <C>one</C>; with <C>gm</C> it finds all three.</>,
  },
  {
    flag: "s",
    meaning: "The dot also matches line breaks",
    example: <><C>a.b</C> on <C>a</C>, a line break, then <C>b</C> has no match without <C>s</C> and matches with it.</>,
  },
  {
    flag: "u",
    meaning: <>Read the text as Unicode code points and allow <C>{"\\p{...}"}</C> classes</>,
    example: <><C>{"\\p{L}+"}</C> with <C>g</C> on <C>{"héllo wörld 123"}</C> finds both words only with <C>u</C>, and nothing without it. And <C>.</C> with <C>g</C> on <C>{"a😀"}</C> gives 3 matches without <C>u</C> (the emoji is split in two) and 2 with it.</>,
  },
  {
    flag: "y",
    meaning: "Sticky: a match must start exactly where the search position is",
    example: <><C>{"\\d+"}</C> finds <C>123</C> in <C>{"123 456"}</C> but nothing in <C>x123</C>. With <C>gy</C> the tester lists <C>123</C> and stops at the space.</>,
  },
];

const REPLACEMENT_TOKENS: { token: string; inserts: string; example: ReactNode }[] = [
  { token: "$1, $2, ...", inserts: "A numbered group", example: <><C>{"(\\w+) (\\w+)"}</C> on <C>{"John Smith"}</C> with <C>{"$2, $1"}</C> gives <C>{"Smith, John"}</C></> },
  { token: "$<name>", inserts: "A named group", example: <><C>{"(?<first>\\w+) (?<last>\\w+)"}</C> with <C>{"$<last> $<first>"}</C> gives <C>{"Smith John"}</C></> },
  { token: "$&", inserts: "The whole match", example: <><C>{"(\\w+) (\\w+)"}</C> on <C>{"John Smith"}</C> with <C>{"$&!"}</C> gives <C>{"John Smith!"}</C></> },
  { token: "$` and $'", inserts: "The text before and after the match", example: <><C>{"\\d+"}</C> on <C>a1b</C> with <C>{"[$`|$&|$']"}</C> gives <C>{"a[a|1|b]b"}</C></> },
  { token: "$$", inserts: "A literal dollar sign", example: <><C>{"\\d+"}</C> on <C>{"price 5"}</C> with <C>{"$$$&"}</C> gives <C>{"price $5"}</C></> },
];

export default function TestRegexInJavascriptGuidePage() {
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
            <span className="inline-flex items-center gap-1.5 text-[var(--cyan)]"><BookOpen className="w-3 h-3" />{guide.tagline}</span>
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
              <strong className="text-[var(--fg)]">To test a regular expression in JavaScript, call <code className={codeClass}>regex.test(text)</code> for a yes or no, or use <code className={codeClass}>text.matchAll(regex)</code> to get every match with its position and capture groups.</strong> To see the same thing highlighted without writing code, paste the pattern and some sample text into the <Link href="/regex-tester" className={linkClass}>Regex Tester</Link>.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>Three ways to test a regex in code</h2>
            <p><code className={codeClass}>test()</code> tells you whether there is a match, <code className={codeClass}>match()</code> returns the first match with its groups, and <code className={codeClass}>matchAll()</code> walks through every match:</p>
            <pre className={preClass}>{String.raw`const date = /(\d{4})-(\d{2})-(\d{2})/;

date.test("Released on 2026-10-01");
// true

"Released on 2026-10-01".match(date);
// ["2026-10-01", "2026", "10", "01"], with index 12

[..."a1b22".matchAll(/\d+/g)].map((m) => [m[0], m.index]);
// [["1", 1], ["22", 3]]`}</pre>
            <p className="mt-4"><code className={codeClass}>matchAll()</code> needs the <code className={codeClass}>g</code> flag and throws a <code className={codeClass}>TypeError</code> without it.</p>
            <p className="mt-4">One trap: a regex with the <code className={codeClass}>g</code> or <code className={codeClass}>y</code> flag remembers where its last match ended in <code className={codeClass}>lastIndex</code>, so the next call starts from there.</p>
            <pre className={preClass}>{`const re = /a/g;
re.test("a"); // true
re.test("a"); // false, the search resumed after the first match`}</pre>
            <p className="mt-4">When you only need a yes or no answer, leave out <code className={codeClass}>g</code>, or set <code className={codeClass}>re.lastIndex = 0</code> before each call.</p>
          </section>

          <section>
            <h2 className={h2Class}>What do the regex flags do?</h2>
            <p>Flags go after the closing slash, as in <code className={codeClass}>/hello/gi</code>, and in any order. The Regex Tester has a switch for six of them. Each example below is a pattern and text you can paste in to see the difference:</p>
            <div className={tableWrapClass}>
              <table className={tableClass}>
                <thead className={theadClass}><tr><th className={thClass}>Flag</th><th className={thClass}>What it does</th><th className={thClass}>Try it</th></tr></thead>
                <tbody className={tbodyClass}>
                  {FLAGS.map((f) => (
                    <tr key={f.flag}><td className={tdCodeClass}>{f.flag}</td><td className={tdClass}>{f.meaning}</td><td className={tdClass}>{f.example}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4">JavaScript has two more flags that the tester has no switch for: <code className={codeClass}>d</code>, which adds the start and end of each group to the result, and <code className={codeClass}>v</code>, an upgraded version of <code className={codeClass}>u</code>.</p>
          </section>

          <section>
            <h2 className={h2Class}>How do capture groups work?</h2>
            <p>Parentheses capture the part of the match they enclose. Groups are numbered by their opening parenthesis, from left to right, and <code className={codeClass}>(?&lt;name&gt;...)</code> gives a group a name. A named group is numbered as well, so it can be read either way:</p>
            <pre className={preClass}>{String.raw`const m = "2026-10-01".match(/(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/);

m.groups.year; // "2026"
m[1];          // "2026"`}</pre>
            <p className="mt-4">The Regex Tester opens with this idea: the pattern <code className={codeClass}>(?&lt;year&gt;\d{"{4}"})-(\d{"{2}"})-(\d{"{2}"})</code> on <code className={codeClass}>Released on 2026-10-01, patched on 2026-10-14.</code> finds two matches. Under Match details, the first one lists <code className={codeClass}>$1: 2026</code>, <code className={codeClass}>$2: 10</code>, <code className={codeClass}>$3: 01</code> and <code className={codeClass}>year: 2026</code>, because <code className={codeClass}>year</code> is also group 1.</p>
            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li><code className={codeClass}>(?:...)</code> groups without capturing, so it takes no number: <code className={codeClass}>(?:a)(b)</code> on <code className={codeClass}>ab</code> has one group, <code className={codeClass}>b</code>.</li>
              <li>A group that did not take part in the match, such as <code className={codeClass}>(b)?</code> in <code className={codeClass}>(a)(b)?c</code> on <code className={codeClass}>ac</code>, is <code className={codeClass}>undefined</code>. The tester shows it as <code className={codeClass}>undefined</code>.</li>
              <li><code className={codeClass}>\k&lt;name&gt;</code> matches the same text a named group matched: <code className={codeClass}>(?&lt;title&gt;\w+), yes \k&lt;title&gt;</code> matches <code className={codeClass}>Sir, yes Sir</code>.</li>
            </ul>
          </section>

          <section>
            <h2 className={h2Class}>How do $1, $&lt;name&gt; and $&amp; work in a replacement?</h2>
            <p>In the replacement text of <code className={codeClass}>replace()</code>, a dollar sign followed by a code inserts part of the match. The tester&apos;s <strong className="text-[var(--fg)]">Replace with</strong> field uses the same rules, and its default <code className={codeClass}>$3/$2/$&lt;year&gt;</code> turns <code className={codeClass}>2026-10-01</code> into <code className={codeClass}>01/10/2026</code>.</p>
            <div className={tableWrapClass}>
              <table className={tableClass}>
                <thead className={theadClass}><tr><th className={thClass}>Code</th><th className={thClass}>Inserts</th><th className={thClass}>Example</th></tr></thead>
                <tbody className={tbodyClass}>
                  {REPLACEMENT_TOKENS.map((t) => (
                    <tr key={t.token}><td className={tdCodeClass}>{t.token}</td><td className={tdClass}>{t.inserts}</td><td className={tdClass}>{t.example}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4">A few details that catch people out:</p>
            <ul className="mt-2 list-disc pl-6 space-y-2">
              <li>Without the <code className={codeClass}>g</code> flag only the first match is replaced. <code className={codeClass}>\d+</code> on <code className={codeClass}>a1 b22 c333</code> with <code className={codeClass}>#</code> gives <code className={codeClass}>a# b22 c333</code>; with <code className={codeClass}>g</code> it gives <code className={codeClass}>a# b# c#</code>.</li>
              <li>A code that points at a group that does not exist stays as written: <code className={codeClass}>$3</code> in a pattern with two groups gives <code className={codeClass}>$3</code>, and <code className={codeClass}>$&lt;first&gt;</code> in a pattern with no named groups stays <code className={codeClass}>$&lt;first&gt;</code>.</li>
              <li>A group that exists but did not match becomes an empty string. <code className={codeClass}>(a)|(b)</code> on <code className={codeClass}>ab</code> with <code className={codeClass}>[$1][$2]</code> gives <code className={codeClass}>[a][][][b]</code>.</li>
              <li>With fewer than ten groups, <code className={codeClass}>$10</code> means group 1 followed by a <code className={codeClass}>0</code>. <code className={codeClass}>(\w+)</code> on <code className={codeClass}>John</code> with <code className={codeClass}>$10</code> gives <code className={codeClass}>John0</code>.</li>
            </ul>
          </section>

          <section>
            <h2 className={h2Class}>Why does a* give empty matches?</h2>
            <p>The <code className={codeClass}>*</code> means zero or more, so <code className={codeClass}>a*</code> can match an empty string anywhere there is no <code className={codeClass}>a</code>. On <code className={codeClass}>baaac</code> with the <code className={codeClass}>g</code> flag it finds four matches: an empty one at position 0, <code className={codeClass}>aaa</code> at 1 to 4, an empty one at 4 (before the <code className={codeClass}>c</code>) and an empty one at the end, 5. Replacing with <code className={codeClass}>X</code> gives <code className={codeClass}>XbXXcX</code>.</p>
            <p className="mt-4">An empty match does not move the search forward, so the engine has to step past it or it would find the same empty match forever. It advances by one UTF-16 code unit, or by one whole character when the <code className={codeClass}>u</code> flag is on. You can see the difference on an emoji: <code className={codeClass}>a*</code> with <code className={codeClass}>g</code> on <code className={codeClass}>😀</code> has three empty matches (at 0, 1 and 2, the middle one inside the character) and two with <code className={codeClass}>gu</code> (at 0 and 2).</p>
            <p className="mt-4">The tester steps past empty matches the same way. It highlights only matches that have text, but the count includes the empty ones, and Match details lists each of them as <em>empty</em>. If you meant &quot;at least one <code className={codeClass}>a</code>&quot;, write <code className={codeClass}>a+</code>.</p>
          </section>

          <section>
            <h2 className={h2Class}>How do I escape special characters?</h2>
            <p>These characters have a meaning in a pattern: <code className={codeClass}>\ ^ $ . * + ? ( ) [ ] {"{ }"} |</code>. Put a backslash in front of one to match it literally. In a regex literal the slash that ends the pattern needs one too, as in <code className={codeClass}>/a\/b/</code>; in the tester you type the pattern without slashes, so a <code className={codeClass}>/</code> needs none.</p>
            <p className="mt-4">Without escaping, <code className={codeClass}>1+1=2?</code> means &quot;one or more 1s, another 1, an equals sign, and an optional 2&quot;: it matches <code className={codeClass}>11=2</code> and does not match <code className={codeClass}>1+1=2</code>. Escaped, <code className={codeClass}>1\+1=2\?</code> matches the text you meant.</p>
            <p className="mt-4">To build a pattern from text a user typed, escape the text first:</p>
            <pre className={preClass}>{String.raw`const escapeRegExp = (text) => text.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");

new RegExp(escapeRegExp("1+1=2?")).test("is 1+1=2? yes"); // true`}</pre>
            <p className="mt-4">Newer engines have <code className={codeClass}>RegExp.escape(text)</code> for this. MDN lists it as Baseline 2025, meaning it has worked across the latest browsers since May 2025, so check your targets before relying on it. It also escapes a leading letter or digit, so <code className={codeClass}>RegExp.escape(&quot;a.b&quot;)</code> returns <code className={codeClass}>\x61\.b</code>, which still matches <code className={codeClass}>a.b</code>.</p>
            <p className="mt-4">Two more places where backslashes bite:</p>
            <ul className="mt-2 list-disc pl-6 space-y-2">
              <li><strong className="text-[var(--fg)]">Strings need their own backslashes.</strong> <code className={codeClass}>new RegExp(&quot;\\d+&quot;)</code> is the pattern <code className={codeClass}>\d+</code>, but <code className={codeClass}>new RegExp(&quot;\d+&quot;)</code> is <code className={codeClass}>d+</code>, because <code className={codeClass}>\d</code> in a string is just <code className={codeClass}>d</code>. The same doubling applies to a pattern stored in a JSON string; the <Link href="/guides/format-and-validate-json" className={linkClass}>JSON guide</Link> covers JSON escaping.</li>
              <li><strong className="text-[var(--fg)]">The u flag is stricter.</strong> Escaping a character that is not special, such as <code className={codeClass}>\a</code> or a <code className={codeClass}>\-</code> outside a character class, is an error with <code className={codeClass}>u</code>; the tester shows <em>Invalid pattern: Invalid escape</em>. Without <code className={codeClass}>u</code> they are allowed.</li>
            </ul>
            <p className="mt-4">Escaping for a regex is a different job from percent-encoding for a URL; see <Link href="/guides/url-encode-string" className={linkClass}>how to URL encode a string</Link> for that one.</p>
          </section>

          <section>
            <h2 className={h2Class}>What is catastrophic backtracking?</h2>
            <p>A regex engine like the one in your browser tries one way to match, and when that fails it goes back and tries the other ways. Some patterns have a huge number of ways. The classic example is <code className={codeClass}>(a+)+$</code>: a run of <code className={codeClass}>a</code> characters can be divided between the inner and the outer <code className={codeClass}>+</code> in exponentially many ways. If the text ends in something that makes <code className={codeClass}>$</code> fail, such as a <code className={codeClass}>b</code>, the engine tries them all before it gives up.</p>
            <pre className={preClass}>{`/(a+)+$/.test("a".repeat(24) + "b");`}</pre>
            <p className="mt-4">Timed in Node 25 (V8) on a laptop, this takes about 50 ms with 22 <code className={codeClass}>a</code> characters, 200 ms with 24 and 800 ms with 26. Each extra <code className={codeClass}>a</code> roughly doubles the time. Your numbers will differ, but the doubling is the point: a few more characters turn milliseconds into minutes.</p>
            <p className="mt-4">The Regex Tester runs your pattern on the page itself, so a pattern like this on longer text can make the tab wait until the engine finishes. The limits of 100,000 characters of text and 1,000 listed matches do not prevent that.</p>
            <p className="mt-4">To avoid it, do not put a quantifier on a group whose contents can already match the same text in several ways. Write <code className={codeClass}>a+$</code> instead of <code className={codeClass}>(a+)+$</code>. That removes the exponential blow-up, but a long run of <code className={codeClass}>a</code> characters followed by a <code className={codeClass}>b</code> still costs time that grows with the square of the length: about 175 ms at 20,000 characters and 700 ms at 40,000 in the same test. So keep the test text short while you work on a pattern, and add the long input last.</p>
          </section>

          <section>
            <h2 className={h2Class}>Try the Regex Tester</h2>
            <p>The <Link href="/regex-tester" className={linkClass}>Regex Tester</Link> runs everything above in your browser:</p>
            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li>Type the pattern in <strong className="text-[var(--fg)]">Pattern</strong> and switch the <code className={codeClass}>g i m s u y</code> flags on and off.</li>
              <li>Paste text into <strong className="text-[var(--fg)]">Test text</strong>. Matches are highlighted as you type, and the heading shows the count.</li>
              <li><strong className="text-[var(--fg)]">Match details</strong> lists each match with its position and its numbered and named groups.</li>
              <li>Type a replacement in <strong className="text-[var(--fg)]">Replace with</strong> and copy the <strong className="text-[var(--fg)]">Result</strong>.</li>
              <li>A pattern that does not compile shows the engine&apos;s reason, such as <em>Invalid pattern: Unterminated group</em> for <code className={codeClass}>(</code>.</li>
              <li>Past 1,000 matches the heading says it is showing the first 1,000. Text over 100,000 characters is not matched, and a message says so.</li>
            </ul>
          </section>

          <section>
            <h2 className={h2Class}>How to test a regular expression in JavaScript</h2>
            <div className="space-y-4">{guide.steps.map((step, i) => <div key={step.name} id={`step-${i + 1}`} className="p-5 rounded-lg border border-[var(--hairline)] bg-[var(--bg-raise)] scroll-mt-20"><h3 className="font-display text-lg font-semibold text-[var(--fg)] mb-2">{i + 1}. {step.name}</h3><p>{step.text}</p></div>)}</div>
          </section>

          {guide.faqs && <section className="pt-6 border-t border-[var(--hairline)]"><h2 className="font-mono text-[11px] tracking-[0.22em] uppercase text-[var(--fg-dim)] mb-6">{"// Frequently Asked Questions"}</h2><div className="grid gap-4">{guide.faqs.map((f) => <Faq key={f.q} q={f.q} a={f.a} />)}</div></section>}
          <section className="pt-6 border-t border-[var(--hairline)]"><div className="font-mono text-[11px] tracking-[0.22em] uppercase text-[var(--fg-dim)] mb-3">Keep reading</div><div className="flex flex-wrap gap-3">{relatedGuides.map((related) => <Link key={related.slug} href={related.path} className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--cyan)] hover:underline">{related.title} <ArrowRight className="w-3.5 h-3.5" /></Link>)}</div></section>
        </div>
      </article>
    </>
  );
}
