import { describe, expect, it } from "vitest";
import { normalizeAmount, normalizeDate, normalizeDigits, parseCsv, parseTable } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses simple comma rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted cells with commas and escaped quotes", () => {
    const grid = parseCsv('name,notes\n" Ahmad, Mr ","he said ""ok"" now"');
    expect(grid[1]).toEqual([" Ahmad, Mr ", 'he said "ok" now']);
  });

  it("supports CRLF and strips BOM", () => {
    expect(parseCsv("\uFEFFa,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("auto-detects semicolons and tabs", () => {
    expect(parseCsv("a;b\n1;2")[0]).toEqual(["a", "b"]);
    expect(parseCsv("a\tb\n1\t2")[1]).toEqual(["1", "2"]);
  });

  it("returns empty for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("parseTable", () => {
  it("splits headers and skips empty rows", () => {
    const t = parseTable("الاسم,الهاتف\nأحمد,0771\n,\n");
    expect(t.headers).toEqual(["الاسم", "الهاتف"]);
    expect(t.rows).toEqual([["أحمد", "0771"]]);
  });
});

describe("normalize helpers", () => {
  it("converts Arabic-Indic digits", () => {
    expect(normalizeDigits("٠٥٣٣٤٤")).toBe("053344");
    expect(normalizeDigits("٢٠٠٠")).toBe("2000");
  });

  it("normalizes amounts (strips currency and separators)", () => {
    expect(normalizeAmount("٢,٠٠٠ ر.ي")).toBe("2000");
    expect(normalizeAmount(" 15000 ")).toBe("15000");
  });

  it("normalizes ISO and dd/mm/yyyy dates", () => {
    expect(normalizeDate("2026-3-5")).toBe("2026-03-05");
    expect(normalizeDate("05/03/2026")).toBe("2026-03-05");
    expect(normalizeDate("ناقص")).toBe("");
    expect(normalizeDate("")).toBe("");
  });
});
