import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Calendar, Clock } from "lucide-react";
import { Faq } from "@/components/shared/Faq";
import { GuideToolCta } from "@/components/shared/GuideToolCta";
import { getGuide, getRelatedGuides } from "@/lib/guides";
import { generateGuideMetadata } from "@/lib/toolMetadata";
import { guideArticleJsonLd, guideBreadcrumbJsonLd, guideFaqJsonLd, guideHowToJsonLd } from "@/lib/jsonLd";

const guide = getGuide("read-and-write-cron-expressions")!;
const relatedGuides = getRelatedGuides(guide.slug);
export const metadata: Metadata = generateGuideMetadata(guide);

const codeClass = "font-mono text-[var(--fg)]";
const preClass = "mt-4 p-4 rounded-lg border border-[var(--hairline)] bg-[var(--bg-soft)] font-mono text-[12.5px] whitespace-pre-wrap text-[var(--fg)]";
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
              <td className={tdClass}>{row[1]}</td>
              <td className={tdClass}>{row[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Every sentence in the "explainer says" columns is what the Cron Expression Explainer shows for
// that expression; lib/__tests__/cron-guide-examples.test.ts checks them against the tool.
const FIELDS: Row[] = [
  ["1. minute", "0 to 59", "The minute of the hour"],
  ["2. hour", "0 to 23", "The hour of the day, on a 24 hour clock"],
  ["3. day of month", "1 to 31", "The day of the month"],
  ["4. month", "1 to 12, or JAN to DEC", "The month of the year"],
  ["5. day of week", "0 to 7, or SUN to SAT", "0 and 7 are both Sunday; Monday is 1"],
];

const OPERATORS: Row[] = [
  [<C key="s">*</C>, "Every value the field allows", <><C>* * * * *</C> is &quot;Every minute&quot;</>],
  [<C key="l">,</C>, "A list of values", <><C>0 9,17 * * *</C> is &quot;At 09:00 and 17:00 every day&quot;</>],
  [<C key="r">-</C>, "A range, including both ends", <><C>0 9-17 * * 1-5</C> is &quot;Every hour, on the hour, from 09:00 through 17:00 on weekdays&quot;</>],
  [<C key="t">/</C>, "A step through * or a range", <><C>*/15 * * * *</C> is &quot;Every 15 minutes&quot;, and <C>0 9-17/2 * * *</C> is &quot;At 09:00, 11:00, 13:00, 15:00 and 17:00 every day&quot;</>],
];

const COMMON: Row[] = [
  ["* * * * *", "Every minute", "Every minute"],
  ["*/5 * * * *", "Every 5 minutes", "Every 5 minutes"],
  ["*/15 * * * *", "Every 15 minutes", "Every 15 minutes"],
  ["0 * * * *", "Every hour", "Every hour, on the hour"],
  ["0 */2 * * *", "Every 2 hours", "Every 2 hours"],
  ["0 0 * * *", "Every day at midnight", "At 00:00 every day"],
  ["0 9,17 * * *", "Twice a day", "At 09:00 and 17:00 every day"],
  ["0 9 * * 1-5", "Weekdays at 09:00", "At 09:00 on weekdays"],
  ["0 12 * * MON,WED,FRI", "Monday, Wednesday and Friday at noon", "At 12:00 on Monday, Wednesday and Friday"],
  ["0 0 * * 0", "Every Sunday at midnight", "At 00:00 on Sunday"],
  ["0 0 1 * *", "The first of every month", "At 00:00 on day 1 of the month"],
  ["0 0 1 */3 *", "The first day of each quarter", "At 00:00 on day 1 of the month in January, April, July and October"],
  ["0 0 1 1 *", "Once a year, on 1 January", "At 00:00 on day 1 of the month in January"],
];

const MACROS: Row[] = [
  ["@yearly", "0 0 1 1 *", <>Once a year. <C>@annually</C> is the same.</>],
  ["@monthly", "0 0 1 * *", "Once a month"],
  ["@weekly", "0 0 * * 0", "Once a week, on Sunday"],
  ["@daily", "0 0 * * *", <>Once a day. <C>@midnight</C> is the same.</>],
  ["@hourly", "0 * * * *", "Once an hour"],
];

const ERRORS: Row[] = [
  ["60 * * * *", "A value out of range", "Invalid minute field: 60 is not in the range 0 to 59"],
  ["5/15 * * * *", "A step on a single number", "Invalid minute field: a step needs * or a range in front of it, such as 5-59/15"],
  ["*/0 * * * *", "A step of zero", "Invalid minute field: the step \"0\" must be a whole number of 1 or more"],
  ["5-1 * * * *", "A range that ends before it starts", "Invalid minute field: the range \"5-1\" ends before it starts"],
  ["0 0 * * * *", "Six fields (seconds first)", "Expected 5 fields (minute, hour, day of month, month, day of week) but found 6. Seconds and year fields (Quartz style) are not supported."],
  ["@reboot", "A macro with no schedule", "@reboot runs once at startup, so it has no schedule to explain."],
  ["@every5m", "A macro that does not exist", "Unknown macro \"@every5m\". Use @hourly, @daily, @weekly, @monthly or @yearly."],
  ["0 0 L * *", "A Quartz symbol","Invalid day of month field: \"L\" is not a valid value"],
];

export default function ReadAndWriteCronExpressionsGuidePage() {
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
            <span className="inline-flex items-center gap-1.5 text-[var(--sky)]"><BookOpen className="w-3 h-3" />{guide.tagline}</span>
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
              <strong className="text-[var(--fg)]">A cron expression has five fields separated by spaces: minute, hour, day of month, month and day of week, in that order.</strong> So <code className={codeClass}>* * * * *</code> runs every minute, <code className={codeClass}>*/5 * * * *</code> every five minutes and <code className={codeClass}>0 9 * * 1-5</code> at 09:00 on weekdays. Paste any expression into the <Link href="/cron-explainer" className={linkClass}>Cron Expression Explainer</Link> to read it in plain English and see when it runs next.
            </p>
            <pre className={preClass}>{["0 9 * * 1-5", "| | | | |", "| | | | +- day of week (0-7 or SUN-SAT)", "| | | +--- month (1-12 or JAN-DEC)", "| | +----- day of month (1-31)", "| +------- hour (0-23)", "+--------- minute (0-59)"].join("\n")}</pre>
            <p className="mt-4">The syntax below follows <a href="https://man7.org/linux/man-pages/man5/crontab.5.html" className={linkClass} rel="noopener noreferrer" target="_blank">crontab(5)</a>, and each example was run through the explainer.</p>
          </section>

          <section>
            <h2 className={h2Class}>What do the five fields of a cron expression mean?</h2>
            <Table heads={["Field", "Allowed values", "Meaning"]} rows={FIELDS} />
            <p className="mt-4">The job runs when the minute, the hour and the month all match, and the day matches by the rule in the section on <a href="#day-rule" className={linkClass}>the two day fields</a>. A field is a single value, or a comma separated list of values, ranges and steps, with no spaces inside it.</p>
          </section>

          <section>
            <h2 className={h2Class}>What does * * * * * mean?</h2>
            <p>Each <code className={codeClass}>*</code> means &quot;every value this field allows&quot;. Five of them mean every minute of every hour of every day, so the job runs once a minute, all the time. The explainer reads it as &quot;Every minute&quot;. Replace a star with a number to narrow it: <code className={codeClass}>30 * * * *</code> is &quot;At minute 30 past every hour&quot;.</p>
          </section>

          <section>
            <h2 className={h2Class}>How do I use lists, ranges, steps and names?</h2>
            <Table heads={["Symbol", "Meaning", "Example"]} rows={OPERATORS} />
            <h3 className={h3Class}>Steps</h3>
            <p>A step is written after <code className={codeClass}>*</code> or after a range. <code className={codeClass}>*/15</code> is every 15th value from the start of the field, and <code className={codeClass}>9-17/2</code> is every second value from 9 to 17. crontab(5) describes steps only after <code className={codeClass}>*</code> and after a range, and the explainer rejects a step on a single number such as <code className={codeClass}>5/15</code>. Write <code className={codeClass}>5-59/15</code> for &quot;every 15 minutes starting at minute 5&quot;, which the explainer reads as &quot;At minutes 5, 20, 35 and 50 past every hour&quot;.</p>
            <h3 className={h3Class}>Names</h3>
            <p>The month and the day of week can be written as the first three letters of the name, in any case: <code className={codeClass}>JAN</code>, <code className={codeClass}>mon</code>, <code className={codeClass}>Fri</code>. The explainer also accepts them in ranges and lists, such as <code className={codeClass}>MON-FRI</code> or <code className={codeClass}>JAN,APR,JUL,OCT</code>, and the version of crontab(5) linked above allows that too. Check the manual of the cron you run, or write numbers.</p>
            <h3 className={h3Class}>Sunday is 0 and 7</h3>
            <p>The day of week takes 0 to 7, and both 0 and 7 are Sunday, so <code className={codeClass}>0 0 * * 0</code> and <code className={codeClass}>0 0 * * 7</code> are the same schedule. <code className={codeClass}>0 0 * * 5-7</code> is Friday through Sunday.</p>
          </section>

          <section>
            <h2 className={h2Class}>What are the most common cron schedules?</h2>
            <Table heads={["Expression", "Schedule", "The explainer says"]} rows={COMMON} />
          </section>

          <section id="day-rule">
            <h2 className={h2Class}>What happens when both the day of month and the day of week are set?</h2>
            <p>When neither day field starts with <code className={codeClass}>*</code>, a day matches if <em>either</em> field matches. The crontab(5) example is <code className={codeClass}>30 4 1,15 * 5</code>: 04:30 on the 1st and the 15th of each month, plus every Friday. From Monday 26 October 2026, the explainer lists Friday 30 October, Sunday 1 November, Friday 6 November, Friday 13 November and Sunday 15 November.</p>
            <h3 className={h3Class}>It is not &quot;the first Monday&quot;</h3>
            <p><code className={codeClass}>0 9 1-7 * 1</code> looks like &quot;the first Monday of the month&quot;, but it runs on days 1 to 7 and on every Monday. Its runs from 26 October 2026 are every day from 1 to 7 November, then Monday 9, 16, 23 and 30 November. Five-field cron has no syntax for the first Monday.</p>
            <h3 className={h3Class}>A field that starts with * counts as unrestricted</h3>
            <p>If either day field starts with <code className={codeClass}>*</code>, even with a step such as <code className={codeClass}>*/10</code>, both have to match. <code className={codeClass}>0 0 */10 * 1</code> runs on a Monday that is also day 1, 11, 21 or 31 of the month: the explainer says &quot;on days 1, 11, 21 and 31 of the month, but only on Monday&quot;, and from 26 October 2026 the first runs are Monday 21 December and Monday 11 January.</p>
            <h3 className={h3Class}>A field that covers everything</h3>
            <p>A day field that lists every value is not the same as <code className={codeClass}>*</code>. <code className={codeClass}>0 0 1-31 * 1-5</code> looks like &quot;weekdays&quot;, but day 1 to 31 matches every day, so it runs every day, weekends included. The explainer reads it as &quot;At 00:00 every day&quot;.</p>
          </section>

          <section>
            <h2 className={h2Class}>Why does */7 not run every 7 minutes?</h2>
            <p>A step counts from the start of the range each time it comes round, and it does not carry on from the last run. <code className={codeClass}>*/7 * * * *</code> runs at minutes 0, 7, 14, 21, 28, 35, 42, 49 and 56 of every hour. After 10:56 the next run is 11:00, only four minutes later, and then 11:07. Only a step that divides the range evenly, such as <code className={codeClass}>*/5</code> or <code className={codeClass}>*/15</code> for minutes, gives an even interval.</p>
            <p className="mt-4">The same happens with days: <code className={codeClass}>0 0 */2 * *</code> is &quot;every other day&quot; only within a month. It runs on days 1, 3, 5 and so on up to 31, so after 31 January the next run is 1 February, the very next day.</p>
            <p className="mt-4">And a day that a month does not have never matches. <code className={codeClass}>0 0 31 * *</code> runs only in months with 31 days: from 1 October 2026 it runs on 31 October, 31 December, 31 January, 31 March and 31 May, and skips November, February, April and June. <code className={codeClass}>0 0 31 2 *</code> never runs, and the explainer says so: &quot;This schedule never runs: February has no day 31.&quot;</p>
          </section>

          <section>
            <h2 className={h2Class}>What are the @daily and @hourly macros?</h2>
            <p>A macro is a shortcut written in place of the five fields:</p>
            <Table heads={["Macro", "Same as", "Meaning"]} rows={MACROS} />
            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li>The explainer reads these macros in any case (<code className={codeClass}>@DAILY</code> works) and shows the five fields a macro stands for.</li>
              <li><code className={codeClass}>@reboot</code> runs once when the system starts, so it has no schedule. The explainer says so instead of describing it.</li>
              <li>crontab(5) lists <code className={codeClass}>@daily</code> and not <code className={codeClass}>@midnight</code>, so check that your cron accepts <code className={codeClass}>@midnight</code> before you use it.</li>
            </ul>
          </section>

          <section>
            <h2 className={h2Class}>Which time zone does a cron expression use?</h2>
            <p>None. An expression only says when, by the clock of whatever runs it. crontab(5) lets a crontab have its own time zone with the <code className={codeClass}>CRON_TZ</code> variable. Check your scheduler&apos;s documentation for its own setting, and find out which zone it uses before you rely on a local time.</p>
            <p className="mt-4">The explainer shows the next five runs in <strong className="text-[var(--fg)]">UTC</strong>, which it starts on, or in the <strong className="text-[var(--fg)]">Local</strong> time zone of your browser, with a switch between them. It does not know the time zone of your server and does not read <code className={codeClass}>CRON_TZ</code>.</p>
            <h3 className={h3Class}>Daylight saving time</h3>
            <p>In Local mode, a time that does not exist because the clocks went forward is left out of the list. In New York the clocks went forward from 02:00 to 03:00 on Sunday 8 March 2026, so <code className={codeClass}>30 2 * * *</code> has no 02:30 that day. In a browser set to New York time, the explainer skips it and lists 9 March next. Real cron can differ. cron(8) says that when the clock moves forward, jobs that run at a specific time and would have run in the skipped interval are run immediately, and that when it moves back, the same job is not run twice. So on a day when the clocks change, trust your scheduler&apos;s documentation over the list.</p>
          </section>

          <section>
            <h2 className={h2Class}>How is a Quartz cron expression different?</h2>
            <p>Quartz, a Java scheduling library, writes its expressions with 6 or 7 fields: seconds first and an optional year last. It also has its own symbols and day numbers, so a Quartz expression is not a cron expression with extra fields.</p>
            <Table
              heads={["", "Five-field cron", "Quartz"]}
              rows={[
                ["Fields", "5, from the minute to the day of week", "6 or 7: seconds first, an optional year last"],
                ["Day of week", "0 to 7 or SUN to SAT. Sunday is 0 and 7, Monday is 1", "1 to 7 or SUN to SAT. In its examples, 1 is Sunday and 2 is Monday"],
                ["The two day fields", "A day matches if either field matches, unless one starts with *", "One of the two has to be ?"],
                ["Extra symbols", "None", "? L W #"],
              ]}
            />
            <p className="mt-4">To turn a Quartz expression into five fields, drop the seconds and the year, replace <code className={codeClass}>?</code> with <code className={codeClass}>*</code>, and recheck the day numbers. Quartz&apos;s <code className={codeClass}>0 0 12 * * ?</code> (noon every day) becomes <code className={codeClass}>0 12 * * *</code>, which the explainer reads as &quot;At 12:00 every day&quot;. Symbols such as <code className={codeClass}>L</code> (last day) and <code className={codeClass}>#</code> (the nth weekday) have no five-field equivalent.</p>
          </section>

          <section>
            <h2 className={h2Class}>What does the Cron Expression Explainer reject?</h2>
            <p>The explainer reads the five standard fields and the macros above. It names the field that is wrong, and says what it did not understand:</p>
            <Table heads={["Expression", "Problem", "What the explainer says"]} rows={ERRORS} />
            <p className="mt-4">Jenkins&apos; <code className={codeClass}>H</code> is not supported either.</p>
          </section>

          <section>
            <h2 className={h2Class}>Try the Cron Expression Explainer</h2>
            <p>Open the <Link href="/cron-explainer" className={linkClass}>Cron Expression Explainer</Link> and type an expression. It shows:</p>
            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li><strong className="text-[var(--fg)]">In plain English</strong>, with a button to copy the sentence, and a note when you used a macro or set both day fields.</li>
              <li><strong className="text-[var(--fg)]">Field by field</strong>, a table of what each of the five fields allows.</li>
              <li><strong className="text-[var(--fg)]">The next 5 runs</strong>, in UTC or your local time zone. A schedule that can never run says so.</li>
              <li>Example buttons for the common schedules, so you can start from one and change it.</li>
              <li>Everything runs in your browser, and nothing you type is uploaded.</li>
            </ul>
          </section>

          <section>
            <h2 className={h2Class}>How to read and write a cron expression</h2>
            <div className="space-y-4">{guide.steps.map((step, i) => <div key={step.name} id={`step-${i + 1}`} className="p-5 rounded-lg border border-[var(--hairline)] bg-[var(--bg-raise)] scroll-mt-20"><h3 className="font-display text-lg font-semibold text-[var(--fg)] mb-2">{i + 1}. {step.name}</h3><p>{step.text}</p></div>)}</div>
          </section>

          {guide.faqs && <section className="pt-6 border-t border-[var(--hairline)]"><h2 className="font-mono text-[11px] tracking-[0.22em] uppercase text-[var(--fg-dim)] mb-6">{"// Frequently Asked Questions"}</h2><div className="grid gap-4">{guide.faqs.map((f) => <Faq key={f.q} q={f.q} a={f.a} />)}</div></section>}
          <section className="pt-6 border-t border-[var(--hairline)]"><div className="font-mono text-[11px] tracking-[0.22em] uppercase text-[var(--fg-dim)] mb-3">Keep reading</div><div className="flex flex-wrap gap-3">{relatedGuides.map((related) => <Link key={related.slug} href={related.path} className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--cyan)] hover:underline">{related.title} <ArrowRight className="w-3.5 h-3.5" /></Link>)}</div></section>
        </div>
      </article>
    </>
  );
}
