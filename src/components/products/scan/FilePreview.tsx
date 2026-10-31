"use client";

import { useEffect, useRef } from "react";
import { FileText } from "lucide-react";

/** Previews the chosen bill. The object URL is revoked when the file changes or the component unmounts. */
export function FilePreview({ file }: { file: File }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const isImage = file.type.startsWith("image/");

  useEffect(() => {
    const image = imageRef.current;
    if (!image || !isImage || typeof URL.createObjectURL !== "function") return;
    const objectUrl = URL.createObjectURL(file);
    image.src = objectUrl;
    return () => {
      URL.revokeObjectURL(objectUrl);
      image.removeAttribute("src");
    };
  }, [file, isImage]);

  const size = `${(file.size / 1024).toFixed(0)} KB`;

  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-background">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- local blob URL, next/image cannot optimise it
        <img ref={imageRef} alt="Preview of your bill" className="mx-auto max-h-96 min-h-24 w-full object-contain" />
      ) : (
        <div className="flex h-40 items-center justify-center text-muted">
          <FileText className="h-10 w-10" aria-hidden />
        </div>
      )}
      <figcaption className="border-t border-line bg-surface px-4 py-2 text-xs text-muted">
        {file.name} · {size}
      </figcaption>
    </figure>
  );
}
