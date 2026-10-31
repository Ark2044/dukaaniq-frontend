import { describe, expect, it } from "vitest";
import { formatDate, formatINR } from "./format";

describe("formatINR", () => {
  it("uses Indian digit grouping", () => {
    expect(formatINR(125680)).toBe("₹1,25,680");
  });

  it("keeps paise only when present", () => {
    expect(formatINR(4850)).toBe("₹4,850");
    expect(formatINR("99.5")).toBe("₹99.5");
  });

  it("returns a dash for invalid input", () => {
    expect(formatINR("abc")).toBe("—");
  });
});

describe("formatDate", () => {
  it("formats in Indian date convention", () => {
    expect(formatDate("2026-03-05T10:00:00Z")).toMatch(/05 Mar 2026/);
  });

  it("returns a dash for invalid dates", () => {
    expect(formatDate("nope")).toBe("—");
  });
});
