import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DOWNSCALE_THRESHOLD_BYTES,
  MAX_BILL_BYTES,
  SIZE_ERROR,
  TYPE_ERROR,
  prepareBillFile,
  scaledSize,
  shouldDownscale,
  validateBillSize,
  validateBillType,
} from "./image";

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });

describe("scaledSize", () => {
  it("never enlarges small images", () => {
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
    expect(scaledSize(2000, 1500)).toEqual({ width: 2000, height: 1500 });
  });

  it("scales the longest side to 2000 px, keeping the aspect ratio", () => {
    expect(scaledSize(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(scaledSize(3000, 6000)).toEqual({ width: 1000, height: 2000 });
    expect(scaledSize(4032, 3024)).toEqual({ width: 2000, height: 1500 });
  });

  it("never produces a zero dimension", () => {
    expect(scaledSize(100000, 10).height).toBeGreaterThanOrEqual(1);
  });
});

describe("validateBillType / validateBillSize", () => {
  it.each([
    ["bill.jpg", "image/jpeg"],
    ["bill.png", "image/png"],
    ["bill.pdf", "application/pdf"],
    ["camera", ""],
  ])("accepts %s (%s)", (name, type) => {
    const f = name === "camera" ? file("IMG_1.JPG", "") : file(name, type);
    expect(validateBillType(f)).toBeNull();
  });

  it.each([
    ["bill.gif", "image/gif"],
    ["bill.heic", "image/heic"],
    ["bill.docx", "application/vnd.openxmlformats"],
    ["bill.txt", ""],
  ])("rejects %s", (name, type) => {
    expect(validateBillType(file(name, type))).toBe(TYPE_ERROR);
  });

  it("enforces the 10 MB limit", () => {
    expect(validateBillSize({ size: MAX_BILL_BYTES } as File)).toBeNull();
    expect(validateBillSize({ size: MAX_BILL_BYTES + 1 } as File)).toBe(SIZE_ERROR);
  });
});

describe("prepareBillFile", () => {
  it("only downscales images above ~1.5 MB", () => {
    expect(shouldDownscale(file("a.jpg", "image/jpeg", DOWNSCALE_THRESHOLD_BYTES))).toBe(false);
    expect(shouldDownscale(file("a.jpg", "image/jpeg", DOWNSCALE_THRESHOLD_BYTES + 1))).toBe(true);
    expect(shouldDownscale(file("a.pdf", "application/pdf", DOWNSCALE_THRESHOLD_BYTES * 3))).toBe(false);
  });

  it("returns small images and PDFs unchanged", async () => {
    const small = file("a.jpg", "image/jpeg", 1000);
    const pdf = file("a.pdf", "application/pdf", DOWNSCALE_THRESHOLD_BYTES * 3);
    expect(await prepareBillFile(small)).toBe(small);
    expect(await prepareBillFile(pdf)).toBe(pdf);
  });

  it("falls back to the original when the browser cannot decode the image", async () => {
    const big = file("a.jpg", "image/jpeg", DOWNSCALE_THRESHOLD_BYTES + 10);
    expect(await prepareBillFile(big)).toBe(big);
  });

  describe("with a mocked canvas", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("re-encodes a large image as a 2000 px JPEG at quality 0.85", async () => {
      vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 4000, height: 3000, close: vi.fn() })));
      const context = { fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: "" };
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
      const encoded: Array<{ width: number; height: number; type?: string; quality?: number }> = [];
      vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (this: HTMLCanvasElement, callback, type, quality) {
        encoded.push({ width: this.width, height: this.height, type, quality });
        callback(new Blob([new Uint8Array(1000)], { type: "image/jpeg" }));
      });

      const big = file("IMG_0001.PNG", "image/png", DOWNSCALE_THRESHOLD_BYTES + 5000);
      const result = await prepareBillFile(big);

      expect(encoded).toEqual([{ width: 2000, height: 1500, type: "image/jpeg", quality: 0.85 }]);
      expect(result.name).toBe("IMG_0001.jpg");
      expect(result.type).toBe("image/jpeg");
      expect(result.size).toBe(1000);
      expect(context.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2000, 1500);
    });

    it("keeps the original when re-encoding would not make it smaller", async () => {
      vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 2500, height: 2500, close: vi.fn() })));
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ fillRect: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
      vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(new Blob([new Uint8Array(DOWNSCALE_THRESHOLD_BYTES * 2)])));
      const big = file("a.jpg", "image/jpeg", DOWNSCALE_THRESHOLD_BYTES + 5000);
      expect(await prepareBillFile(big)).toBe(big);
    });
  });
});
