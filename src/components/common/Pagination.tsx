import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}

/** Zero-based `page` in, one-based text out. The summary is a polite live region so page changes are announced. */
export function Pagination({ page, totalPages, totalItems, itemLabel, onPageChange }: PaginationProps) {
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3">
      <p aria-live="polite" className="text-sm text-muted">
        {totalItems} {itemLabel} · Page {Math.min(page + 1, Math.max(totalPages, 1))} of {Math.max(totalPages, 1)}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" className="min-h-11 px-3" disabled={page <= 0} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
        </Button>
        <Button
          variant="secondary"
          className="min-h-11 px-3"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
