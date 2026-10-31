import { describe, expect, it } from "vitest";
import { CSV_COLUMNS, buildProductsCsv, toCsvCell } from "./csv";
import { billResultToFormValues, toCsvRows } from "@/lib/validation/billScan";
import { mixedResult, scanLine, scanResult } from "@/test/billScanFixtures";

describe("toCsvCell", () => {
  it("leaves plain values untouched", () => {
    expect(toCsvCell("Tata Salt")).toBe("Tata Salt");
    expect(toCsvCell("")).toBe("");
    expect(toCsvCell("दूध")).toBe("दूध");
  });

  it("quotes values with commas, quotes and newlines, doubling inner quotes", () => {
    expect(toCsvCell("Salt, iodised")).toBe('"Salt, iodised"');
    expect(toCsvCell('5" pack')).toBe('"5"" pack"');
    expect(toCsvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(toCsvCell("line1\r\nline2")).toBe('"line1\r\nline2"');
  });

  it.each(["=SUM(A1:A9)", "+91 98765", "-2+3", "@cmd", "\tTabbed"])("neutralises formula prefix in %j", (value) => {
    expect(toCsvCell(value).startsWith("'") || toCsvCell(value).startsWith(`"'`)).toBe(true);
  });

  it("neutralises a formula and still quotes it when needed", () => {
    expect(toCsvCell('=HYPERLINK("http://x","y")')).toBe(`"'=HYPERLINK(""http://x"",""y"")"`);
  });

  it("does not prefix a formula character that is not at the start", () => {
    expect(toCsvCell("A=B")).toBe("A=B");
  });
});

describe("buildProductsCsv", () => {
  it("writes the import-template header and CRLF rows", () => {
    const csv = buildProductsCsv([{ name: "Tata Salt", unit: "KG", selling_price: "28" }]);
    expect(csv.split("\r\n")).toEqual([
      "name,brand,category,sku,barcode,unit,pack_size,selling_price,cost_price,stock_quantity,reorder_level,aliases",
      "Tata Salt,,,,,KG,,28,,,,",
      "",
    ]);
    expect(CSV_COLUMNS).toHaveLength(12);
  });

  it("produces only a header for no rows", () => {
    expect(buildProductsCsv([]).trim().split("\r\n")).toHaveLength(1);
  });
});

describe("toCsvRows", () => {
  it("includes only CREATE lines, using the current (edited) values", () => {
    const values = billResultToFormValues(mixedResult());
    values.lines[1].name = '=cmd|"x"';
    values.lines[1].category = "Biscuits, sweet";
    const csv = buildProductsCsv(toCsvRows(values.lines));
    const rows = csv.trim().split("\r\n");
    expect(rows).toHaveLength(2);
    expect(rows[1]).toBe(`"'=cmd|""x""",Parle,"Biscuits, sweet",,,PACKET,1,28,24,20,,`);
  });

  it("leaves the selling price empty when the bill has none", () => {
    const values = billResultToFormValues(scanResult([scanLine({ suggestedSellingPrice: null, mrp: null })]));
    expect(toCsvRows(values.lines)[0].selling_price).toBe("");
  });
});
