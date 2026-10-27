import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Calendar, Clock } from "lucide-react";
import { Faq } from "@/components/shared/Faq";
import { GuideToolCta } from "@/components/shared/GuideToolCta";
import { getGuide, getRelatedGuides } from "@/lib/guides";
import { generateGuideMetadata } from "@/lib/toolMetadata";
import { guideArticleJsonLd, guideBreadcrumbJsonLd, guideFaqJsonLd, guideHowToJsonLd } from "@/lib/jsonLd";

const guide = getGuide("convert-camelcase-snake-case-kebab-case")!;
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
const linkClass = "text-[var(--cyan)] hover:underline";

const C = ({ children }: { children: string }) => <code className={codeClass}>{children}</code>;

type Row = [ReactNode, ReactNode, ReactNode];
function Table({ heads, rows }: { heads: [string, string, string]; rows: Row[] }) {
  return (
    <div className={tableWrapClass}>
      <table className={tableClass}>
        <thead className={theadClass}>
          <tr>{heads.map((head) => <th key={head} className={thClass}>{head}</th>)}</tr>
        </thead>
        <tbody className={tbodyClass}>
          {rows.map((row, i) => (
            <tr key={i}>
              <td className={tdCodeClass}>{row[0]}</td>
              <td className={tdCodeClass}>{row[1]}</td>
              <td className={tdClass}>{row[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Every result below is what the Text Case Converter gives for that input;
// lib/__tests__/case-guide-examples.test.ts checks them against the tool.
const SAME_NAME: [string, string, string][] = [
  ["camelCase", "userId", "The first word is lowercase, and every word after it starts with a capital"],
  ["PascalCase", "UserId", "Every word starts with a capital"],
  ["snake_case", "user_id", "Lowercase words joined with underscores"],
  ["CONSTANT_CASE", "USER_ID", "Uppercase words joined with underscores"],
  ["kebab-case", "user-id", "Lowercase words joined with hyphens"],
  ["dot.case", "user.id", "Lowercase words joined with dots"],
];

const WHERE_USED: Row[] = [
  ["camelCase", "userName", "JavaScript methods, parameters and local variables. The Google JavaScript Style Guide calls it lowerCamelCase."],
  ["PascalCase", "UserName", "Class names: UpperCamelCase in the Google JavaScript Style Guide, and CapWords in PEP 8."],
  ["snake_case", "user_name", "Python function, variable and method names: PEP 8 asks for lowercase with words separated by underscores."],
  ["CONSTANT_CASE", "MAX_RETRY_COUNT", "Constants. The Google JavaScript Style Guide uses the name CONSTANT_CASE, and PEP 8 writes constants in all capital letters with underscores between words."],
  ["kebab-case", "user-name", "URLs, where Google recommends hyphens over underscores, and CSS, whose property names are hyphenated (background-color)."],
  ["dot.case", "user.name", "Names that use dots as separators. The converter joins the words with dots."],
];

const CONVERT: Row[] = [
  ["userName", "snake_case", "user_name"],
  ["user_name", "camelCase", "userName"],
  ["user_name", "kebab-case", "user-name"],
  ["getUserById", "snake_case", "get_user_by_id"],
  ["background-color", "camelCase", "backgroundColor"],
  ["MAX_RETRY_COUNT", "camelCase", "maxRetryCount"],
  ["my-component-name", "PascalCase", "MyComponentName"],
];

const SPLITS: Row[] = [
  ["userName", "user, name", "A lowercase letter meets a capital"],
  ["user2Id", "user2, id", "A digit meets a capital, so snake_case gives user2_id"],
  ["html5Parser", "html5, parser", "A letter followed by a digit is not a break, so snake_case gives html5_parser"],
  ["XMLHttpRequest", "xml, http, request", "A run of capitals followed by a capitalized word: the last capital starts the new word"],
  ["getHTTPResponse", "get, http, response", "The same rule: HTTP stays together, and Response starts a new word"],
  ["foo--bar__baz", "foo, bar, baz", "A run of separators counts as one"],
  ["snake_case-and.dots/slashes", "snake, case, and, dots, slashes", "A space, _, -, . and / all separate words in the six identifier styles"],
];

const SURPRISES: Row[] = [
  ["OAuth2", "snake_case: o_auth2", "A run of capitals followed by a capitalized word splits O from Auth2"],
  ["PDFs", "snake_case: pd_fs", "The F and the s are read as the start of a new word"],
  ["iPhone", "snake_case: i_phone", "A lowercase letter meets a capital"],
  ["macOS", "snake_case: mac_os", "A lowercase letter meets a capital"],
  ["HTTPServerError", "PascalCase: HttpServerError", "Every word is lowercased first, so the acronym loses its capitals"],
];

export default function ConvertCamelcaseSnakeCaseKebabCaseGuidePage() {
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
            <span className="inline-flex items-center gap-1.5 text-[var(--lime)]"><BookOpen className="w-3 h-3" />{guide.tagline}</span>
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
              <strong className="text-[var(--fg)]">camelCase joins the words of a name and capitalizes each new word (<code className={codeClass}>userId</code>), snake_case joins lowercase words with underscores (<code className={codeClass}>user_id</code>), and kebab-case joins them with hyphens (<code className={codeClass}>user-id</code>).</strong> To convert one into another, split the name into its words and join them again in the new style, or paste it into the <Link href="/case-converter" className={linkClass}>Text Case Converter</Link>, which shows all ten styles at once.
            </p>
            <p className="mt-4">The same name, <code className={codeClass}>user id</code>, in the six identifier styles:</p>
            <Table heads={["Style", "Result", "How it is written"]} rows={SAME_NAME} />
          </section>

          <section>
            <h2 className={h2Class}>Where is each naming style used?</h2>
            <Table heads={["Style", "Example", "Where you will see it"]} rows={WHERE_USED} />
            <p className="mt-4">The rules come from the style guides themselves: <a href="https://peps.python.org/pep-0008/#naming-conventions" className={linkClass} rel="noopener noreferrer" target="_blank">PEP 8</a> for Python, the <a href="https://google.github.io/styleguide/jsguide.html#naming" className={linkClass} rel="noopener noreferrer" target="_blank">Google JavaScript Style Guide</a> for JavaScript, and Google&apos;s <a href="https://developers.google.com/search/docs/crawling-indexing/url-structure" className={linkClass} rel="noopener noreferrer" target="_blank">URL structure guidance</a> for URLs. Your own project or team may follow a different one, so check it before you rename things.</p>
            <p className="mt-4">The other two styles in the converter are for prose, not names: <strong className="text-[var(--fg)]">Title Case</strong> (<code className={codeClass}>The Lord Of The Rings</code>) and <strong className="text-[var(--fg)]">Sentence case</strong> (<code className={codeClass}>The lord of the rings</code>), plus plain <strong className="text-[var(--fg)]">lowercase</strong> and <strong className="text-[var(--fg)]">UPPERCASE</strong>.</p>
          </section>

          <section>
            <h2 className={h2Class}>How do I convert a name from one style to another?</h2>
            <p>Every conversion does the same three things: split the name into words, lowercase them, and join them the way the new style asks. The style the name started in does not matter, because the splitting finds the words in all of them.</p>
            <Table heads={["Name", "Convert to", "Result"]} rows={CONVERT} />
            <p className="mt-4">Some conversions cross a boundary between two worlds. A CSS property such as <code className={codeClass}>background-color</code> is <code className={codeClass}>backgroundColor</code> on <code className={codeClass}>element.style</code> in JavaScript: MDN says that this object has dash-named and camel-case named properties for every CSS property.</p>
          </section>

          <section>
            <h2 className={h2Class}>How is a name split into words?</h2>
            <p>The converter breaks a name into words in two ways. It splits at separators (a space, <code className={codeClass}>_</code>, <code className={codeClass}>-</code>, <code className={codeClass}>.</code> and <code className={codeClass}>/</code>), and it splits inside a name where the capitals are:</p>
            <Table heads={["Name", "Words", "Why"]} rows={SPLITS} />
            <p className="mt-4">Letters that are not ASCII work too: <code className={codeClass}>élan vital</code> becomes <code className={codeClass}>élanVital</code> and <code className={codeClass}>élan_vital</code>.</p>
          </section>

          <section>
            <h2 className={h2Class}>What happens to acronyms and numbers?</h2>
            <p>Every word is lowercased before the words are joined, so an acronym does not keep its capitals. <code className={codeClass}>XMLHttpRequest</code> becomes <code className={codeClass}>xmlHttpRequest</code> in camelCase and <code className={codeClass}>xml_http_request</code> in snake_case, and <code className={codeClass}>new customer ID</code> becomes <code className={codeClass}>newCustomerId</code>.</p>
            <p className="mt-4">That is the rule of the Google JavaScript Style Guide, whose own examples are <code className={codeClass}>xmlHttpRequest</code> and <code className={codeClass}>newCustomerId</code>, and not <code className={codeClass}>XMLHTTPRequest</code> and <code className={codeClass}>newCustomerID</code>. PEP 8 asks for the opposite in a class name: capitalize all the letters of an acronym, so <code className={codeClass}>HTTPServerError</code> and not <code className={codeClass}>HttpServerError</code>. The converter gives you <code className={codeClass}>HttpServerError</code>, so for Python class names put the capitals back by hand.</p>
            <h3 className={h3Class}>Names that do not split the way you expect</h3>
            <p>The converter looks only at the capital letters, so a name with an unusual mix of cases can be split in a surprising place:</p>
            <Table heads={["Name", "The converter gives", "Why"]} rows={SURPRISES} />
            <p className="mt-4">Check results like these and fix them by hand. Because the capitals are the only clue, a round trip loses information: <code className={codeClass}>HTTPServerError</code> to snake_case is <code className={codeClass}>http_server_error</code>, and back to PascalCase is <code className={codeClass}>HttpServerError</code>.</p>
            <h3 className={h3Class}>Numbers</h3>
            <p>A digit stays with the letters before it, so <code className={codeClass}>html5Parser</code> is <code className={codeClass}>html5_parser</code>, not <code className={codeClass}>html_5_parser</code>. A digit followed by a capital starts a new word: <code className={codeClass}>user2Id</code> is <code className={codeClass}>user2_id</code>. A dot between digits is a separator in the identifier styles, so <code className={codeClass}>version 3.5</code> becomes <code className={codeClass}>version_3_5</code> in snake_case and <code className={codeClass}>version35</code> in camelCase, where the digits run together. Edit those by hand.</p>
          </section>

          <section>
            <h2 className={h2Class}>How are Title Case and Sentence case different?</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li><strong className="text-[var(--fg)]">Title Case capitalizes every word</strong>, small ones included: <code className={codeClass}>the lord of the rings</code> becomes <code className={codeClass}>The Lord Of The Rings</code>. The converter does not know which small words your style guide leaves lowercase, so edit those by hand. It also lowercases an acronym first, so <code className={codeClass}>NASA launches rocket</code> becomes <code className={codeClass}>Nasa Launches Rocket</code>.</li>
              <li><strong className="text-[var(--fg)]">Sentence case capitalizes only the first word of each line</strong>, not the first word of each sentence: <code className={codeClass}>first line. second line</code> becomes <code className={codeClass}>First line. second line</code>.</li>
              <li><strong className="text-[var(--fg)]">Both keep punctuation</strong>, and they do not split at <code className={codeClass}>.</code> or <code className={codeClass}>/</code>: <code className={codeClass}>version 3.5</code> becomes <code className={codeClass}>Version 3.5</code>. The six identifier styles keep only letters and digits, so <code className={codeClass}>Hello, World!</code> becomes <code className={codeClass}>helloWorld</code> in camelCase and <code className={codeClass}>Hello, World!</code> in Title Case, and <code className={codeClass}>$userName</code> becomes <code className={codeClass}>userName</code> in camelCase but stays <code className={codeClass}>$user Name</code> in Title Case.</li>
            </ul>
          </section>

          <section>
            <h2 className={h2Class}>Which style should I use in a URL?</h2>
            <p>Use kebab-case. Google recommends separating the words in a URL with hyphens instead of underscores, because a hyphen clearly signals a word boundary. Google also treats URLs as case sensitive, so <code className={codeClass}>/Apple</code> and <code className={codeClass}>/apple</code> are different URLs, and it is simplest to write a URL in one case. The converter&apos;s kebab-case output is always lowercase.</p>
          </section>

          <section>
            <h2 className={h2Class}>What is specific to the Text Case Converter?</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>It shows <strong className="text-[var(--fg)]">all ten styles at once</strong>: camelCase, PascalCase, snake_case, CONSTANT_CASE, kebab-case, dot.case, Title Case, Sentence case, lowercase and UPPERCASE, each with its own Copy button.</li>
              <li>It converts <strong className="text-[var(--fg)]">every line separately</strong>, so you can paste a whole list of names. <code className={codeClass}>user_id</code>, <code className={codeClass}>XMLHttpRequest</code> and <code className={codeClass}>  Hello   World </code> on three lines give <code className={codeClass}>userId</code>, <code className={codeClass}>xmlHttpRequest</code> and <code className={codeClass}>helloWorld</code> in camelCase.</li>
              <li>Extra spaces around and between the words are ignored.</li>
              <li>When a style has nothing at all to show for your input, such as the identifier styles for <code className={codeClass}>!!!</code>, its card shows a dash.</li>
              <li>Everything runs in your browser, and nothing you type is uploaded.</li>
            </ul>
          </section>

          <section>
            <h2 className={h2Class}>Try the Text Case Converter</h2>
            <p>Open the <Link href="/case-converter" className={linkClass}>Text Case Converter</Link>, paste a few names, one per line, and copy the style you need. Try <code className={codeClass}>OAuth2</code> or <code className={codeClass}>getHTTPResponse</code> to see how the splitting works. If the name goes into a URL, the <Link href="/guides/url-encode-string" className={linkClass}>guide to URL encoding</Link> covers the characters that have to be percent-encoded.</p>
          </section>

          <section>
            <h2 className={h2Class}>How to convert between camelCase, snake_case and kebab-case</h2>
            <div className="space-y-4">{guide.steps.map((step, i) => <div key={step.name} id={`step-${i + 1}`} className="p-5 rounded-lg border border-[var(--hairline)] bg-[var(--bg-raise)] scroll-mt-20"><h3 className="font-display text-lg font-semibold text-[var(--fg)] mb-2">{i + 1}. {step.name}</h3><p>{step.text}</p></div>)}</div>
          </section>

          {guide.faqs && <section className="pt-6 border-t border-[var(--hairline)]"><h2 className="font-mono text-[11px] tracking-[0.22em] uppercase text-[var(--fg-dim)] mb-6">{"// Frequently Asked Questions"}</h2><div className="grid gap-4">{guide.faqs.map((f) => <Faq key={f.q} q={f.q} a={f.a} />)}</div></section>}
          <section className="pt-6 border-t border-[var(--hairline)]"><div className="font-mono text-[11px] tracking-[0.22em] uppercase text-[var(--fg-dim)] mb-3">Keep reading</div><div className="flex flex-wrap gap-3">{relatedGuides.map((related) => <Link key={related.slug} href={related.path} className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--cyan)] hover:underline">{related.title} <ArrowRight className="w-3.5 h-3.5" /></Link>)}</div></section>
        </div>
      </article>
    </>
  );
}
