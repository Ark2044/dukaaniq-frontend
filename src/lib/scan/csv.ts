/** Column order of the product import template (GET /products/import/template). */
export const CSV_COLUMNS = [
  "name",
  "brand",
  "category",
  "sku",
  "barcode",
  "unit",
  "pack_size",
  "selling_price",
  "cost_price",
  "stock_quantity",
  "reorder_level",
  "aliases",
] as const;

export type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** Quotes a CSV cell when needed and neutralises spreadsheet formulas (CSV injection) with a leading quote. */
export function toCsvCell(value: string): string {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function buildProductsCsv(rows: ReadonlyArray<Partial<CsvRow>>): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(CSV_COLUMNS.map((column) => toCsvCell(row[column] ?? "")).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

/** Triggers a browser download. A BOM is prepended so Excel reads UTF-8 (Hindi/Marathi names) correctly. */
export function downloadTextFile(filename: string, content: string, mimeType = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF", content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
