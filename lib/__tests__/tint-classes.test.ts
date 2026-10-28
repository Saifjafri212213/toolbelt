import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import config from "../../tailwind.config";

// Tailwind 3 cannot put an opacity on a var() colour. `border-[var(--rose)]/30` builds no CSS at all, so the box
// silently falls back to the default grey border with no tint. The tinted boxes use `border-tint-rose-30` and
// `bg-tint-rose-5` instead (see tailwind.config.ts).

const ROOT = join(__dirname, "..", "..");
const SOURCE_DIRS = ["app", "components", "lib"];
const SOURCE_FILE = /\.(tsx?|jsx?|mdx|css)$/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" || name === "node_modules" ? [] : sourceFiles(path);
    return SOURCE_FILE.test(name) ? [path] : [];
  });
}

const files = SOURCE_DIRS.flatMap((dir) => sourceFiles(join(ROOT, dir)));
const text = (file: string) => readFileSync(file, "utf8");

// A utility whose value is a var() colour followed by an opacity: `-[var(--x)]/30`, `-[var(--x)]/[0.3]`.
const VAR_OPACITY = /-\[var\(--[\w-]+\)\]\/(\d|\[)/;
const TINT_CLASS = /\b(?:bg|border|text|ring|outline|divide|fill|stroke|shadow|from|via|to)-tint-[a-z]+-\d+\b/g;

describe("tinted boxes", () => {
  it("finds the source files it checks", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("uses no [var(--x)]/NN opacity class, which Tailwind 3 never builds", () => {
    const offenders = files.flatMap((file) =>
      text(file)
        .split("\n")
        .flatMap((line, i) => (VAR_OPACITY.test(line) ? [`${relative(ROOT, file)}:${i + 1}`] : [])),
    );
    expect(offenders).toEqual([]);
  });

  it("catches the class it bans", () => {
    for (const bad of ["border-[var(--rose)]/30", "bg-[var(--cyan)]/5", "text-[var(--fg-muted)]/[0.4]"]) {
      expect(VAR_OPACITY.test(`className="p-3 ${bad}"`)).toBe(true);
    }
    for (const fine of ["border-[var(--rose)]", "bg-tint-rose-5", "border-tint-green-30", "w-1/2", "bg-accent-rose/30"]) {
      expect(VAR_OPACITY.test(`className="p-3 ${fine}"`)).toBe(false);
    }
  });

  describe("the tint classes", () => {
    const used = [...new Set(files.flatMap((file) => text(file).match(TINT_CLASS) ?? []))].sort();

    async function build(classes: string[]): Promise<string> {
      const result = await postcss([
        tailwindcss({ ...config, content: [{ raw: classes.join(" "), extension: "html" }] }),
      ]).process("@tailwind utilities;", { from: undefined });
      return result.css;
    }

    it("are used by the boxes that were missing their tint", () => {
      expect(used.length).toBeGreaterThanOrEqual(10);
      expect(used).toContain("border-tint-rose-30");
      expect(used).toContain("bg-tint-rose-5");
    });

    it("are all built by Tailwind, each as a mix of the accent with transparent", async () => {
      const css = await build(used);
      for (const name of used) {
        const [, accent, step] = /tint-([a-z]+)-(\d+)$/.exec(name) as RegExpExecArray;
        const property = name.startsWith("bg-") ? "background-color" : "border-color";
        expect(css, name).toContain(`.${name} {`);
        expect(css, name).toContain(`${property}: color-mix(in srgb, var(--${accent}) ${step}%, transparent)`);
      }
    });

    it("is not built for a percentage nobody added", async () => {
      expect(await build(["border-tint-rose-35"])).not.toContain("tint-rose-35");
    });
  });
});
