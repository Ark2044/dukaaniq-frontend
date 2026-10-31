export const MAX_BILL_BYTES = 10 * 1024 * 1024;
export const DOWNSCALE_THRESHOLD_BYTES = 1.5 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 2000;
export const JPEG_QUALITY = 0.85;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const EXTENSION_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", pdf: "application/pdf" };

export const TYPE_ERROR = "Please choose a JPEG, PNG or PDF file.";
export const SIZE_ERROR = "This file is larger than 10 MB. Try a smaller photo or a lower-resolution scan.";

/** Some phones report an empty MIME type, so fall back to the file extension. */
function effectiveType(file: File): string {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[extension] ?? "";
}

export function validateBillType(file: File): string | null {
  return ALLOWED_TYPES.includes(effectiveType(file)) ? null : TYPE_ERROR;
}

export function validateBillSize(file: File): string | null {
  return file.size > MAX_BILL_BYTES ? SIZE_ERROR : null;
}

/** Scales (never enlarges) so the longest side is at most `max`, keeping the aspect ratio. */
export function scaledSize(width: number, height: number, max = MAX_IMAGE_DIMENSION) {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const ratio = max / longest;
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

export const shouldDownscale = (file: File) =>
  effectiveType(file).startsWith("image/") && file.size > DOWNSCALE_THRESHOLD_BYTES;

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => undefined };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));

/**
 * Shrinks large photos (max 2000 px, JPEG) so uploads are fast on mobile data. Falls back to the original
 * file whenever the browser cannot decode or encode it; the caller still validates the final size.
 */
export async function prepareBillFile(file: File): Promise<File> {
  if (!shouldDownscale(file)) return file;
  try {
    const decoded = await decode(file);
    try {
      const { width, height } = scaledSize(decoded.width, decoded.height);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return file;
      // JPEG has no alpha channel; paint white so transparent PNG areas do not turn black.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(decoded.source, 0, 0, width, height);
      const blob = await toBlob(canvas);
      if (!blob || blob.size >= file.size) return file;
      const baseName = file.name.replace(/\.[^.]+$/, "") || "bill";
      return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
    } finally {
      decoded.release();
    }
  } catch {
    return file;
  }
}
