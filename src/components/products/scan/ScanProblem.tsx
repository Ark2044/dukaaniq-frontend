"use client";

import Link from "next/link";
import { AlertTriangle, Lightbulb } from "lucide-react";
import { Button, buttonStyles } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import type { ScanProblem as Problem } from "./problems";

const TIPS = [
  "Place the bill on a flat, plain surface in good light.",
  "Keep the whole item list in the frame and avoid glare or shadows.",
  "Hold the phone steady and parallel to the paper.",
];

export function ScanProblem({ problem, onRetry }: { problem: Problem; onRetry: () => void }) {
  const showTips = problem.kind === "failed" || problem.kind === "timeout" || problem.kind === "empty";
  return (
    <Card className="space-y-4 border-danger/30">
      <div role="alert" className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
        <div>
          <h2 className="text-base font-semibold text-danger">{problem.title}</h2>
          <p className="mt-1 text-sm">{problem.message}</p>
        </div>
      </div>

      {showTips && (
        <div className="rounded-xl bg-background p-4 text-sm">
          <p className="mb-2 flex items-center gap-2 font-medium">
            <Lightbulb className="h-4 w-4" aria-hidden /> Try a clearer photo
          </p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            {TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {problem.kind === "not-configured" ? (
          <>
            <Link href="/inventory/new" className={buttonStyles("primary")}>
              Add a product manually
            </Link>
            <Link href="/inventory/import" className={buttonStyles("secondary")}>
              Import a CSV
            </Link>
          </>
        ) : (
          <Button onClick={onRetry}>Try again</Button>
        )}
      </div>
    </Card>
  );
}
