import { Loader2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";

export function ProcessingStep({ stage, onCancel }: { stage: "uploading" | "reading"; onCancel: () => void }) {
  return (
    <Card className="flex flex-col items-center space-y-4 px-6 py-12 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-navy-700" aria-hidden />
      <div role="status" aria-live="polite">
        <h2 className="text-lg font-semibold">{stage === "uploading" ? "Uploading your bill…" : "Reading your bill…"}</h2>
        <p className="mt-1 max-w-sm text-sm text-muted">
          This usually takes under a minute. Nothing is added to your inventory until you review and confirm.
        </p>
      </div>
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
    </Card>
  );
}
