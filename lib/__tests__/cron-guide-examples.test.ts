import { afterEach, describe, expect, it } from "vitest";
import { getGuide, getGuidesForTool } from "../guides";
import { describeCron, FIELD_SPECS, nextRuns, noRunsMessage, parseCron, type ParsedCron } from "../cron";

// Every example in the "How to Read and Write a Cron Expression" guide, run through the Cron
// Expression Explainer's own functions, so the guide cannot drift from what the tool does.

function parse(expression: string): ParsedCron {
  const result = parseCron(expression);
  if (!result.ok) throw new Error(`"${expression}" should parse: ${result.error}`);
  return result.value;
}
const error = (expression: string) => {
  const result = parseCron(expression);
  if (result.ok) throw new Error(`"${expression}" should not parse`);
  return result.error;
};
const say = (expression: string) => describeCron(parse(expression));

// The guide's runs are worked out from Monday 26 October 2026, 10:07 UTC.
const FROM = new Date("2026-10-26T10:07:00Z");
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const runs = (expression: string, count = 5, from = FROM) =>
  nextRuns(parse(expression), from, count).map((date) => `${DAYS[date.getUTCDay()]} ${date.toISOString().slice(0, 16).replace("T", " ")}`);

describe("cron guide: the five fields", () => {
  it("lists the fields in order, with the ranges the guide gives", () => {
    expect(FIELD_SPECS.map(({ label, min, max }) => [label, min, max])).toEqual([
      ["minute", 0, 59],
      ["hour", 0, 23],
      ["day of month", 1, 31],
      ["month", 1, 12],
      ["day of week", 0, 7],
    ]);
  });

  it("takes names for the month and the day of week, and for no other field", () => {
    expect(FIELD_SPECS.filter((spec) => spec.names).map((spec) => spec.name)).toEqual(["month", "dayOfWeek"]);
  });

  it("reads * * * * * as every minute, and a number in place of a star as narrower", () => {
    expect(say("* * * * *")).toBe("Every minute");
    expect(say("30 * * * *")).toBe("At minute 30 past every hour");
  });

  it("explains the diagram's example, 0 9 * * 1-5, at 09:00 on weekdays", () => {
    expect(say("0 9 * * 1-5")).toBe("At 09:00 on weekdays");
  });
});

describe("cron guide: lists, ranges, steps and names", () => {
  it.each([
    ["* * * * *", "Every minute"],
    ["0 9,17 * * *", "At 09:00 and 17:00 every day"],
    ["0 9-17 * * 1-5", "Every hour, on the hour, from 09:00 through 17:00 on weekdays"],
    ["*/15 * * * *", "Every 15 minutes"],
    ["0 9-17/2 * * *", "At 09:00, 11:00, 13:00, 15:00 and 17:00 every day"],
    ["5-59/15 * * * *", "At minutes 5, 20, 35 and 50 past every hour"],
  ])("reads %s as %j", (expression, sentence) => {
    expect(say(expression)).toBe(sentence);
  });

  it("rejects a step on a single number, and suggests the range", () => {
    expect(error("5/15 * * * *")).toBe("Invalid minute field: a step needs * or a range in front of it, such as 5-59/15");
  });

  it("takes names in any case, in lists and in ranges", () => {
    for (const expression of ["0 0 * * MON-FRI", "0 0 * * mon-fri", "0 0 * * Mon-Fri"]) expect(say(expression)).toBe("At 00:00 on weekdays");
    expect(say("0 0 1 JAN,APR,JUL,OCT *")).toBe("At 00:00 on day 1 of the month in January, April, July and October");
    expect(say("0 0 1 jan,apr,jul,oct *")).toBe(say("0 0 1 JAN,APR,JUL,OCT *"));
    expect(say("0 12 * * MON,WED,FRI")).toBe("At 12:00 on Monday, Wednesday and Friday");
  });

  it("makes both 0 and 7 Sunday, and reads 5-7 as Friday through Sunday", () => {
    expect(say("0 0 * * 0")).toBe("At 00:00 on Sunday");
    expect(say("0 0 * * 7")).toBe("At 00:00 on Sunday");
    expect(say("0 0 * * SUN")).toBe("At 00:00 on Sunday");
    expect(runs("0 0 * * 0", 3)).toEqual(runs("0 0 * * 7", 3));
    expect(say("0 0 * * 5-7")).toBe("At 00:00 on Friday through Sunday");
  });
});

describe("cron guide: common schedules", () => {
  it.each([
    ["* * * * *", "Every minute"],
    ["*/5 * * * *", "Every 5 minutes"],
    ["*/15 * * * *", "Every 15 minutes"],
    ["0 * * * *", "Every hour, on the hour"],
    ["0 */2 * * *", "Every 2 hours"],
    ["0 0 * * *", "At 00:00 every day"],
    ["0 9,17 * * *", "At 09:00 and 17:00 every day"],
    ["0 9 * * 1-5", "At 09:00 on weekdays"],
    ["0 12 * * MON,WED,FRI", "At 12:00 on Monday, Wednesday and Friday"],
    ["0 0 * * 0", "At 00:00 on Sunday"],
    ["0 0 1 * *", "At 00:00 on day 1 of the month"],
    ["0 0 1 */3 *", "At 00:00 on day 1 of the month in January, April, July and October"],
    ["0 0 1 1 *", "At 00:00 on day 1 of the month in January"],
  ])("reads %s as %j", (expression, sentence) => {
    expect(say(expression)).toBe(sentence);
  });

  it("runs */5 at minutes 0, 5, 10 and so on up to 55", () => {
    expect(parse("*/5 * * * *").minute.values).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  });
});

describe("cron guide: the two day fields", () => {
  it("matches a day if either field matches when neither starts with * (the crontab(5) example)", () => {
    expect(say("30 4 1,15 * 5")).toBe("At 04:30 on days 1 and 15 of the month and on Friday");
    expect(runs("30 4 1,15 * 5")).toEqual([
      "Fri 2026-10-30 04:30",
      "Sun 2026-11-01 04:30",
      "Fri 2026-11-06 04:30",
      "Fri 2026-11-13 04:30",
      "Sun 2026-11-15 04:30",
    ]);
  });

  it("does not make 0 9 1-7 * 1 the first Monday: it runs on days 1 to 7 and on every Monday", () => {
    expect(runs("0 9 1-7 * 1", 11)).toEqual([
      "Sun 2026-11-01 09:00",
      "Mon 2026-11-02 09:00",
      "Tue 2026-11-03 09:00",
      "Wed 2026-11-04 09:00",
      "Thu 2026-11-05 09:00",
      "Fri 2026-11-06 09:00",
      "Sat 2026-11-07 09:00",
      "Mon 2026-11-09 09:00",
      "Mon 2026-11-16 09:00",
      "Mon 2026-11-23 09:00",
      "Mon 2026-11-30 09:00",
    ]);
  });

  it("needs both fields to match when one starts with *, even with a step", () => {
    expect(say("0 0 */10 * 1")).toBe("At 00:00 on days 1, 11, 21 and 31 of the month, but only on Monday");
    expect(runs("0 0 */10 * 1", 2)).toEqual(["Mon 2026-12-21 00:00", "Mon 2027-01-11 00:00"]);
  });

  it("counts a field as unrestricted when it starts with *, not when it only contains one", () => {
    // 1,* lists every day, but does not start with *, so the either rule applies and every day runs.
    expect(runs("0 0 1,* * 1", 3)).toEqual(["Tue 2026-10-27 00:00", "Wed 2026-10-28 00:00", "Thu 2026-10-29 00:00"]);
    // */2 starts with *, so both fields have to match: an odd day that is also a Monday (2 November is not).
    expect(runs("0 0 */2 * 1", 1)).toEqual(["Mon 2026-11-09 00:00"]);
  });

  it("runs every day, weekends included, for a day field that lists every value", () => {
    expect(say("0 0 1-31 * 1-5")).toBe("At 00:00 every day");
    expect(runs("0 0 1-31 * 1-5")).toContain("Sat 2026-10-31 00:00");
  });
});

describe("cron guide: steps count from the start of the range", () => {
  it("runs */7 at minutes 0 to 56, so 10:56 is followed by 11:00, four minutes later", () => {
    expect(parse("*/7 * * * *").minute.values).toEqual([0, 7, 14, 21, 28, 35, 42, 49, 56]);
    expect(runs("*/7 * * * *", 3, new Date("2026-10-26T10:50:00Z"))).toEqual(["Mon 2026-10-26 10:56", "Mon 2026-10-26 11:00", "Mon 2026-10-26 11:07"]);
  });

  it("only gives an even interval for a step that divides the range", () => {
    for (const step of [5, 15]) expect(60 % step).toBe(0);
    expect(60 % 7).not.toBe(0);
  });

  it("runs 0 0 */2 * * on odd days, so 31 January is followed by 1 February", () => {
    expect(runs("0 0 */2 * *", 2, new Date("2026-01-29T10:00:00Z"))).toEqual(["Sat 2026-01-31 00:00", "Sun 2026-02-01 00:00"]);
  });

  it("skips the months that have no day 31, and never runs 0 0 31 2 *", () => {
    expect(runs("0 0 31 * *", 6, new Date("2026-10-01T00:00:00Z"))).toEqual([
      "Sat 2026-10-31 00:00",
      "Thu 2026-12-31 00:00",
      "Sun 2027-01-31 00:00",
      "Wed 2027-03-31 00:00",
      "Mon 2027-05-31 00:00",
      "Sat 2027-07-31 00:00",
    ]);
    expect(nextRuns(parse("0 0 31 2 *"), FROM, 5)).toEqual([]);
    expect(noRunsMessage(parse("0 0 31 2 *"))).toBe("This schedule never runs: February has no day 31.");
  });
});

describe("cron guide: macros", () => {
  const fields = (cron: ParsedCron) => [cron.minute, cron.hour, cron.dayOfMonth, cron.month, cron.dayOfWeek].map((field) => field.raw).join(" ");

  it.each([
    ["@yearly", "0 0 1 1 *"],
    ["@annually", "0 0 1 1 *"],
    ["@monthly", "0 0 1 * *"],
    ["@weekly", "0 0 * * 0"],
    ["@daily", "0 0 * * *"],
    ["@midnight", "0 0 * * *"],
    ["@hourly", "0 * * * *"],
  ])("makes %s the same as %s", (macro, expansion) => {
    const cron = parse(macro);
    expect(fields(cron)).toBe(expansion);
    expect(cron.macro).toBe(macro);
    expect(say(macro)).toBe(say(expansion));
  });

  it("reads a macro in any case", () => {
    expect(fields(parse("@DAILY"))).toBe("0 0 * * *");
    expect(fields(parse("@Hourly"))).toBe("0 * * * *");
  });

  it("says that @reboot has no schedule, and rejects a macro that does not exist", () => {
    expect(error("@reboot")).toBe("@reboot runs once at startup, so it has no schedule to explain.");
    expect(error("@every5m")).toBe('Unknown macro "@every5m". Use @hourly, @daily, @weekly, @monthly or @yearly.');
  });
});

describe("cron guide: time zones", () => {
  const original = process.env.TZ;
  afterEach(() => {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });

  it("works in UTC unless told to use the local time zone", () => {
    expect(nextRuns(parse("0 9 * * *"), FROM, 1)[0].toISOString()).toBe("2026-10-27T09:00:00.000Z");
  });

  it("lists the runs after the moment you are at, not one at that exact minute", () => {
    expect(nextRuns(parse("0 9 * * *"), new Date("2026-10-27T09:00:00Z"), 1)[0].toISOString()).toBe("2026-10-28T09:00:00.000Z");
    expect(nextRuns(parse("0 9 * * *"), new Date("2026-10-27T08:59:59Z"), 1)[0].toISOString()).toBe("2026-10-27T09:00:00.000Z");
  });

  it("leaves out a local time that does not exist when the clocks go forward (New York, 8 March 2026)", () => {
    process.env.TZ = "America/New_York";
    // The clocks go from 02:00 to 03:00 on Sunday 8 March, so there is no 02:30 that day.
    const before = new Date(2026, 2, 7, 12, 0);
    const days = nextRuns(parse("30 2 * * *"), before, 4, { utc: false }).map((date) => [date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()]);
    expect(days).toEqual([
      [3, 9, 2, 30],
      [3, 10, 2, 30],
      [3, 11, 2, 30],
      [3, 12, 2, 30],
    ]);
    // A time that does exist on that day is still listed.
    expect(nextRuns(parse("0 3 * * *"), before, 1, { utc: false })[0].getDate()).toBe(8);
  });

  it("lists a local time once when it happens twice because the clocks go back (New York, 1 November 2026)", () => {
    process.env.TZ = "America/New_York";
    // The clocks go from 02:00 back to 01:00 on Sunday 1 November, so 01:30 happens twice.
    const before = new Date(2026, 9, 31, 12, 0);
    const days = nextRuns(parse("30 1 * * *"), before, 3, { utc: false }).map((date) => [date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()]);
    expect(days).toEqual([
      [11, 1, 1, 30],
      [11, 2, 1, 30],
      [11, 3, 1, 30],
    ]);
  });
});

describe("cron guide: Quartz style", () => {
  it("rejects six and seven fields, and says why", () => {
    const message = "Expected 5 fields (minute, hour, day of month, month, day of week) but found";
    expect(error("0 0 12 * * ?")).toBe(`${message} 6. Seconds and year fields (Quartz style) are not supported.`);
    expect(error("0 0 12 * * ? *")).toBe(`${message} 7. Seconds and year fields (Quartz style) are not supported.`);
    expect(error("0 0 * * * *")).toBe(`${message} 6. Seconds and year fields (Quartz style) are not supported.`);
  });

  it("reads the five-field version of Quartz's noon every day, 0 12 * * *", () => {
    expect(say("0 12 * * *")).toBe("At 12:00 every day");
  });

  it("rejects Quartz's L, ? and #, and Jenkins' H", () => {
    expect(error("0 0 L * *")).toBe('Invalid day of month field: "L" is not a valid value');
    expect(error("0 0 ? * *")).toBe('Invalid day of month field: "?" is not a valid value');
    expect(error("0 0 * * 1#2")).toBe('Invalid day of week field: "1#2" is not a valid value');
    expect(error("H * * * *")).toBe('Invalid minute field: "H" is not a valid value');
  });
});

describe("cron guide: what the explainer rejects", () => {
  it.each([
    ["60 * * * *", "Invalid minute field: 60 is not in the range 0 to 59"],
    ["5/15 * * * *", "Invalid minute field: a step needs * or a range in front of it, such as 5-59/15"],
    ["*/0 * * * *", 'Invalid minute field: the step "0" must be a whole number of 1 or more'],
    ["5-1 * * * *", 'Invalid minute field: the range "5-1" ends before it starts'],
    ["0 0 * * * *", "Expected 5 fields (minute, hour, day of month, month, day of week) but found 6. Seconds and year fields (Quartz style) are not supported."],
    ["@reboot", "@reboot runs once at startup, so it has no schedule to explain."],
    ["@every5m", 'Unknown macro "@every5m". Use @hourly, @daily, @weekly, @monthly or @yearly.'],
    ["0 0 L * *", 'Invalid day of month field: "L" is not a valid value'],
  ])("says %j for %s", (expression, message) => {
    expect(error(expression)).toBe(message);
  });

  it("names the field that is wrong", () => {
    const result = parseCron("60 * * * *");
    expect(result.ok ? null : result.field).toBe("minute");
  });
});

describe("cron guide: registry", () => {
  it("is linked from the Cron Expression Explainer", () => {
    const guide = getGuide("read-and-write-cron-expressions")!;
    expect(guide.relatedTools).toEqual(["cron-explainer"]);
    expect(getGuidesForTool("cron-explainer").map((g) => g.slug)).toContain(guide.slug);
  });

  it("answers the FAQ about every 5 minutes with an expression the explainer reads that way", () => {
    const guide = getGuide("read-and-write-cron-expressions")!;
    const faq = guide.faqs!.find((item) => item.q.includes("every 5 minutes"))!;
    expect(faq.a).toContain("*/5 * * * *");
    expect(faq.a).toContain(`"${say("*/5 * * * *")}"`);
  });

  it("answers the FAQ about skipped months the way the explainer runs it", () => {
    const guide = getGuide("read-and-write-cron-expressions")!;
    const faq = guide.faqs!.find((item) => item.q.includes("skip some months"))!;
    const months = runs("0 0 31 * *", 12, new Date("2026-01-01T00:00:00Z")).map((run) => Number(run.slice(9, 11)));
    for (const skipped of [2, 4, 6, 9, 11]) expect(months).not.toContain(skipped);
    expect(faq.a).toContain("February, April, June, September and November");
  });
});
