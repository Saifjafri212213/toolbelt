import { describe, it, expect } from "vitest";
import { CASE_STYLES, splitWords, toCase } from "../case-utils";
import { getGuide } from "../guides";

// Every example printed in /guides/convert-camelcase-snake-case-kebab-case is
// run through the Case Converter's own functions, so the guide cannot drift
// from what the tool really does.

describe("case guide: the ten styles", () => {
  it("lists the ten styles with the examples shown in the guide", () => {
    expect(CASE_STYLES.map((s) => [s.label, s.example])).toEqual([
      ["camelCase", "helloWorld"],
      ["PascalCase", "HelloWorld"],
      ["snake_case", "hello_world"],
      ["CONSTANT_CASE", "HELLO_WORLD"],
      ["kebab-case", "hello-world"],
      ["dot.case", "hello.world"],
      ["Title Case", "Hello World"],
      ["Sentence case", "Hello world"],
      ["lowercase", "hello world"],
      ["UPPERCASE", "HELLO WORLD"],
    ]);
  });

  it("renders one name in every style", () => {
    const expected = {
      camel: "userId",
      pascal: "UserId",
      snake: "user_id",
      constant: "USER_ID",
      kebab: "user-id",
      dot: "user.id",
      title: "User Id",
      sentence: "User id",
      lower: "user id",
      upper: "USER ID",
    } as const;
    for (const [style, out] of Object.entries(expected)) {
      expect(toCase("user id", style as keyof typeof expected)).toBe(out);
    }
  });
});

describe("case guide: converting a name", () => {
  it.each([
    ["getUserById", "snake", "get_user_by_id"],
    ["background-color", "camel", "backgroundColor"],
    ["MAX_RETRY_COUNT", "camel", "maxRetryCount"],
    ["user_name", "pascal", "UserName"],
    ["UserName", "kebab", "user-name"],
    ["userName", "constant", "USER_NAME"],
    ["my-component-name", "pascal", "MyComponentName"],
  ] as const)("%s -> %s = %s", (input, style, out) => {
    expect(toCase(input, style)).toBe(out);
  });

  it("splits on every separator and on case boundaries", () => {
    expect(splitWords("snake_case-and.dots/slashes")).toEqual(["snake", "case", "and", "dots", "slashes"]);
    expect(splitWords("foo--bar__baz")).toEqual(["foo", "bar", "baz"]);
    expect(splitWords("  Hello   World ")).toEqual(["hello", "world"]);
    expect(splitWords("userId")).toEqual(["user", "id"]);
    expect(splitWords("getHTTPResponse")).toEqual(["get", "http", "response"]);
  });
});

describe("case guide: acronyms and numbers", () => {
  it("lowercases acronyms the way the Google JavaScript style guide does", () => {
    expect(toCase("XMLHttpRequest", "camel")).toBe("xmlHttpRequest");
    expect(toCase("HTTPServerError", "pascal")).toBe("HttpServerError");
    expect(toCase("userID", "camel")).toBe("userId");
    expect(toCase("new customer ID", "camel")).toBe("newCustomerId");
    expect(toCase("IOError", "snake")).toBe("io_error");
  });

  it("round-trips an acronym name only lossily", () => {
    const snake = toCase("HTTPServerError", "snake");
    expect(snake).toBe("http_server_error");
    expect(toCase(snake, "pascal")).toBe("HttpServerError");
    expect(toCase(snake, "camel")).toBe("httpServerError");
  });

  it("keeps digits inside the word they follow", () => {
    expect(toCase("user2Id", "snake")).toBe("user2_id");
    expect(toCase("html5Parser", "kebab")).toBe("html5-parser");
    expect(toCase("item10Count", "snake")).toBe("item10_count");
    expect(toCase("v2Beta", "pascal")).toBe("V2Beta");
    expect(toCase("2fast", "pascal")).toBe("2fast");
    expect(toCase("i18n", "constant")).toBe("I18N");
  });

  it("documents the surprises honestly", () => {
    expect(toCase("OAuth2", "snake")).toBe("o_auth2");
    expect(toCase("PDFs", "snake")).toBe("pd_fs");
    expect(toCase("iPhone", "snake")).toBe("i_phone");
    expect(toCase("macOS", "snake")).toBe("mac_os");
    expect(toCase("version 3.5", "camel")).toBe("version35");
    expect(toCase("version 3.5", "snake")).toBe("version_3_5");
  });
});

describe("case guide: identifier styles versus prose styles", () => {
  it("identifier styles drop punctuation", () => {
    expect(toCase("Hello, World!", "snake")).toBe("hello_world");
    expect(toCase("$userName", "camel")).toBe("userName");
  });

  it("Title and Sentence case keep punctuation and only split at _ - and spaces", () => {
    expect(toCase("Hello, World!", "title")).toBe("Hello, World!");
    expect(toCase("Hello, World!", "sentence")).toBe("Hello, world!");
    expect(toCase("version 3.5", "title")).toBe("Version 3.5");
    expect(toCase("$userName", "title")).toBe("$user Name");
    expect(toCase("a/b.c", "title")).toBe("A/b.c");
    expect(toCase("snake_case-and.dots/slashes", "title")).toBe("Snake Case And.dots/slashes");
  });

  it("Title Case capitalizes small words too", () => {
    expect(toCase("the lord of the rings", "title")).toBe("The Lord Of The Rings");
    expect(toCase("the lord of the rings", "sentence")).toBe("The lord of the rings");
  });

  it("kebab-case is always lowercase", () => {
    expect(toCase("NASA launches rocket", "kebab")).toBe("nasa-launches-rocket");
    expect(toCase("MAX_RETRY_COUNT", "kebab")).toBe("max-retry-count");
  });

  it("works one line at a time", () => {
    expect(toCase("user_id\nXMLHttpRequest\n  Hello   World ", "snake")).toBe(
      "user_id\nxml_http_request\nhello_world",
    );
  });

  it("yields nothing for input with no letters or digits in identifier styles", () => {
    expect(toCase("!!!", "camel")).toBe("");
    expect(toCase("!!!", "title")).toBe("!!!");
    expect(toCase("   ", "snake")).toBe("");
    expect(toCase("", "snake")).toBe("");
  });

  it("keeps non-ASCII letters", () => {
    expect(toCase("élan vital", "pascal")).toBe("ÉlanVital");
    expect(toCase("café_au_lait", "kebab")).toBe("café-au-lait");
  });
});

describe("case guide: registry entry", () => {
  const guide = getGuide("convert-camelcase-snake-case-kebab-case")!;

  it("exists and points at the Case Converter", () => {
    expect(guide).toBeDefined();
    expect(guide.relatedTools).toContain("case-converter");
  });

  it("FAQ examples match the tool's output", () => {
    const text = JSON.stringify(guide);
    expect(text).toContain("getUserById");
    expect(text).toContain("get_user_by_id");
    expect(toCase("getUserById", "snake")).toBe("get_user_by_id");
    expect(toCase("XMLHttpRequest", "camel")).toBe("xmlHttpRequest");
    expect(toCase("HTTPServerError", "pascal")).toBe("HttpServerError");
  });
});
