import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Icon from "./Icon";

function PdfPreview({ filePath, pages }) {
  const [previewImage, setPreviewImage] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [previewPage, setPreviewPage] = useState(pages === "even" ? 2 : 1);
  // Which page the image on screen belongs to, so "loading" stays derived
  const [imageForPage, setImageForPage] = useState(0);

  const loading = imageForPage !== previewPage;

  // Odd/even skips every other page, so the pager matches what gets printed
  const pageStep = pages === "all" ? 1 : 2;
  const canPrev = previewPage - pageStep >= 1;
  const canNext = pageCount > 0 && previewPage + pageStep <= pageCount;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const count = await invoke("pdf_page_count", { filePath });
        if (!cancelled) setPageCount(count);
      } catch {
        // No count means no pager, page 1 still shows
        if (!cancelled) setPageCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const img = await invoke("preview_page", {
          filePath,
          page: previewPage,
        });
        if (!cancelled) setPreviewImage(img);
      } catch {
        if (!cancelled) setPreviewImage(null);
      } finally {
        if (!cancelled) setImageForPage(previewPage);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filePath, previewPage]);

  return (
    <>
      <div className="flex-1 rounded-xl border border-neutral-300 bg-white overflow-hidden flex items-center justify-center min-h-0">
        {previewImage ? (
          <img
            src={previewImage}
            alt={`PDF preview, page ${previewPage}`}
            className={`w-full h-full object-contain transition-opacity ${
              loading ? "opacity-40" : "opacity-100"
            }`}
          />
        ) : loading ? (
          <p className="text-xs text-neutral-300">Rendering…</p>
        ) : (
          <p className="text-xs text-neutral-300">Preview unavailable</p>
        )}
      </div>

      {pageCount > 0 && (
        <div className="mt-2.5 flex items-center justify-center gap-1">
          <button
            onClick={() => setPreviewPage((p) => p - pageStep)}
            disabled={!canPrev}
            aria-label="Previous page"
            className="w-7 h-7 flex items-center justify-center rounded border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Icon name="chevronLeft" className="w-3 h-3" />
          </button>
          <span className="px-2 text-[11px] text-neutral-500 tabular-nums">
            Page {previewPage} of {pageCount}
            {pages !== "all" && (
              <span className="text-neutral-400"> · {pages} only</span>
            )}
          </span>
          <button
            onClick={() => setPreviewPage((p) => p + pageStep)}
            disabled={!canNext}
            aria-label="Next page"
            className="w-7 h-7 flex items-center justify-center rounded border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Icon name="chevronRight" className="w-3 h-3" />
          </button>
        </div>
      )}
    </>
  );
}

export default PdfPreview;
