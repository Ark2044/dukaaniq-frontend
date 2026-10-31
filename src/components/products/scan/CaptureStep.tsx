"use client";

import { useId, type ChangeEvent } from "react";
import { Camera, ImageUp, Loader2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { FormAlert } from "@/components/forms/FormAlert";
import { FilePreview } from "./FilePreview";
import { cn } from "@/lib/utils/format";

interface CaptureStepProps {
  file: File | null;
  preparing: boolean;
  error: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
  onScan: () => void;
}

const PICKER_CLASSES =
  "flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-navy-700";

export function CaptureStep({ file, preparing, error, onPick, onClear, onScan }: CaptureStepProps) {
  const cameraId = useId();
  const galleryId = useId();

  const handle = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    // Reset so choosing the same file again still fires a change event.
    event.target.value = "";
    if (chosen) onPick(chosen);
  };

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Scan a supplier bill</h2>
        <p className="mt-1 text-sm text-muted">
          Take a clear photo of the bill, or upload a photo or PDF. We&apos;ll read the items for you to review before
          anything is saved.
        </p>
      </div>

      <FormAlert message={error} />

      {file && !preparing && <FilePreview file={file} />}
      {preparing && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Preparing your image…
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor={cameraId} className={cn(PICKER_CLASSES, "bg-navy-900 text-white hover:bg-navy-700")}>
          <Camera className="h-5 w-5" aria-hidden /> Take a photo
          <input
            id={cameraId}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            capture="environment"
            onChange={handle}
            className="sr-only"
          />
        </label>
        <label htmlFor={galleryId} className={cn(PICKER_CLASSES, "border border-line bg-surface hover:bg-background")}>
          <ImageUp className="h-5 w-5" aria-hidden /> Upload from gallery/files
          <input
            id={galleryId}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={handle}
            className="sr-only"
          />
        </label>
      </div>
      <p className="text-xs text-muted">JPEG, PNG or PDF, up to 10 MB. Large photos are shrunk automatically.</p>

      {file && !preparing && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onScan}>Scan this bill</Button>
          <Button variant="secondary" onClick={onClear}>
            Remove file
          </Button>
        </div>
      )}
    </Card>
  );
}
