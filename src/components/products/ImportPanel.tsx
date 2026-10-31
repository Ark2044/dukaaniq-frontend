"use client";

import { useId, useState, type ChangeEvent } from "react";
import { Download, FileUp } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImportResults } from "./ImportResults";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { useToast } from "@/components/common/Toast";
import { FormAlert } from "@/components/forms/FormAlert";
import { IMPORT_TEMPLATE_URL, importProducts, productKeys } from "@/lib/api/products";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export function validateImportFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".csv")) return "Please choose a .csv file.";
  if (file.size > MAX_IMPORT_BYTES) return "The file is larger than 5 MB. Split it into smaller files.";
  return null;
}

export function ImportPanel() {
  const inputId = useId();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ file, dryRun }: { file: File; dryRun: boolean }) => importProducts(file, dryRun),
    onSuccess: async (result) => {
      if (result.dryRun) return;
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
      toast.success(`${result.importedCount} ${result.importedCount === 1 ? "product" : "products"} imported.`);
    },
  });

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null;
    mutation.reset();
    if (!chosen) {
      setFile(null);
      setFileError(null);
      return;
    }
    const problem = validateImportFile(chosen);
    setFileError(problem);
    setFile(problem ? null : chosen);
  };

  const run = (dryRun: boolean) => {
    if (file) mutation.mutate({ file, dryRun });
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Upload a CSV file</h2>
          <p className="mt-1 text-sm text-muted">
            UTF-8 CSV, up to 5 MB and 2,000 rows. Required columns: name, unit, selling_price. Use <strong>|</strong> to
            separate aliases.
          </p>
          <a
            href={IMPORT_TEMPLATE_URL}
            download
            className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-navy-900 underline"
          >
            <Download className="h-4 w-4" aria-hidden /> Download CSV template
          </a>
        </div>

        <div>
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
            CSV file
          </label>
          <input
            id={inputId}
            type="file"
            accept=".csv,text/csv"
            onChange={onFileChange}
            aria-invalid={fileError ? true : undefined}
            aria-describedby={fileError ? `${inputId}-error` : undefined}
            className="block min-h-12 w-full rounded-xl border border-line bg-surface p-2 text-sm file:mr-3 file:min-h-8 file:rounded-lg file:border-0 file:bg-background file:px-3 file:text-sm file:font-medium"
          />
          {fileError && (
            <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-xs font-medium text-danger">
              {fileError}
            </p>
          )}
          {file && (
            <p className="mt-1.5 text-xs text-muted">
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {mutation.isError && <FormAlert message={mutation.error.message} />}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="secondary"
            disabled={!file || mutation.isPending}
            loading={mutation.isPending && mutation.variables?.dryRun === true}
            onClick={() => run(true)}
          >
            Preview (dry run)
          </Button>
          <Button
            disabled={!file || mutation.isPending}
            loading={mutation.isPending && mutation.variables?.dryRun === false}
            onClick={() => run(false)}
          >
            <FileUp className="h-4 w-4" aria-hidden /> Import
          </Button>
        </div>
      </Card>

      {mutation.data && <ImportResults result={mutation.data} />}
    </div>
  );
}
