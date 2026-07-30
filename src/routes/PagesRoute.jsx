import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import DropZone from "../components/DropZone";
import StatusBanner from "../components/StatusBanner";
import PageHeader from "../components/PageHeader";
import Panel from "../components/Panel";
import Icon from "../components/Icon";
import { readDocumentBytes, countPages, applyPageEdits } from "../lib/pdf";
import { saveFileAsDocument, saveBytesAsDocument } from "../lib/document";
import { darkBtnCls, ghostBtnCls, chipCls } from "../lib/ui";

function PagesRoute() {
  const { doc, setDoc, status, setStatus } = useOutletContext();
  const navigate = useNavigate();

  // Everything about the PDF currently loaded, keyed by the path it came from
  const [loaded, setLoaded] = useState(null);
  const [busy, setBusy] = useState(false);

  const path = doc?.path ?? null;
  const loading = path !== null && loaded?.path !== path;

  useEffect(() => {
    if (!path) return;
    let cancelled = false;

    (async () => {
      try {
        const bytes = await readDocumentBytes(path);
        const count = await countPages(bytes);
        const thumbs = await invoke("preview_pages", {
          filePath: path,
          from: 1,
          to: count,
        });
        if (cancelled) return;
        setLoaded({
          path,
          bytes,
          thumbs,
          pages: Array.from({ length: count }, (_, i) => ({
            index: i,
            keep: true,
          })),
        });
      } catch (err) {
        if (cancelled) return;
        setStatus({ msg: `Could not read this PDF: ${err}`, type: "error" });
        setLoaded({ path, bytes: null, thumbs: [], pages: [] });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [path, setStatus]);

  const handlePick = async (file) => {
    setStatus(null);
    try {
      setDoc(await saveFileAsDocument(file));
    } catch (err) {
      setStatus({ msg: `Failed to save file: ${err}`, type: "error" });
    }
  };

  const updatePage = (index, change) => {
    setLoaded((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.index === index ? { ...p, ...change } : p)),
    }));
  };

  // Drops the loaded PDF so a different one can be picked
  const handleClear = () => {
    setDoc(null);
    setLoaded(null);
    setStatus(null);
  };

  const resetPages = () => {
    setLoaded((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => ({ ...p, keep: true })),
    }));
  };

  const pages = loaded?.pages ?? [];
  const kept = pages.filter((p) => p.keep);
  const edited = pages.some((p) => !p.keep);

  const handleApply = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const bytes = await applyPageEdits(loaded.bytes, kept);
      setDoc(await saveBytesAsDocument(bytes, `edited-${doc.name}`));
      setStatus({
        msg: `Saved ${kept.length} of ${pages.length} pages. Ready to print.`,
        type: "success",
      });
      navigate("/");
    } catch (err) {
      setStatus({ msg: `Could not apply changes: ${err}`, type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5">
          <PageHeader
            title="Edit pages"
            description="Click any page to drop it. Your original file is never changed — this builds a new PDF."
          />

          <StatusBanner status={status} />

          {!doc && (
            <div className="max-w-md">
              <Panel title="Choose a PDF" description="Or load one on the Print page and come back here.">
                <DropZone onPick={handlePick} icon="document" title="Add a PDF" />
              </Panel>
            </div>
          )}

          {doc && (
            <Panel
              title={doc.name}
              description={
                loading
                  ? "Rendering pages…"
                  : `${pages.length} page${pages.length === 1 ? "" : "s"} · keeping ${kept.length}`
              }
              action={
                <div className="flex items-center gap-2">
                  {edited && (
                    <button onClick={resetPages} className={ghostBtnCls}>
                      <Icon name="undo" className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  )}
                  <button
                    onClick={handleClear}
                    title="Remove this PDF and pick another"
                    className={`${ghostBtnCls} hover:border-red-200 hover:bg-red-50 hover:text-red-600`}
                  >
                    <Icon name="trash" className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              }
              bodyClassName={loading || pages.length > 0 ? "" : "hidden"}
            >
              {loading ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                  {Array.from({ length: 8 }, (_, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-neutral-100 animate-pulse aspect-[1/1.41]"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                  {pages.map((page) => (
                    <button
                      key={page.index}
                      onClick={() => updatePage(page.index, { keep: !page.keep })}
                      title={page.keep ? "Click to drop this page" : "Click to keep it"}
                      className={`group relative block w-full rounded-lg border bg-white overflow-hidden transition-all duration-200 ${
                        page.keep
                          ? "border-neutral-300 hover:border-neutral-500"
                          : "border-red-300 bg-red-50/50 scale-[0.97]"
                      }`}
                    >
                      <span className="block p-2">
                        {loaded.thumbs[page.index] ? (
                          <img
                            src={loaded.thumbs[page.index]}
                            alt={`Page ${page.index + 1}`}
                            className={`w-full rounded border border-neutral-100 transition-all duration-200 ${
                              page.keep ? "" : "opacity-25 grayscale"
                            }`}
                          />
                        ) : (
                          <span className="block w-full aspect-[1/1.41] rounded bg-neutral-50 border border-neutral-100" />
                        )}
                      </span>

                      {/* A quiet label over a faded page, rather than a big cross */}
                      {!page.keep && (
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-red-200">
                            <Icon name="trash" className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-normal text-red-600">
                              Removed
                            </span>
                          </span>
                        </span>
                      )}

                      <span className="block px-2 pb-2">
                        <span
                          className={`text-[10px] font-medium tabular-nums transition-colors ${
                            page.keep ? "text-neutral-400" : "text-red-500"
                          }`}
                        >
                          Page {page.index + 1}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>

      {doc && (
        <div className="shrink-0 border-t border-neutral-200 bg-white/90 backdrop-blur px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className={chipCls}>
              {kept.length} of {pages.length} kept
            </span>
            {kept.length === 0 && pages.length > 0 && (
              <span className="text-[11px] text-amber-700">
                Keep at least one page
              </span>
            )}
          </div>
          <button
            onClick={handleApply}
            disabled={busy || loading || kept.length === 0}
            className={darkBtnCls}
          >
            {busy ? "Saving..." : "Apply & print"}
            {!busy && <Icon name="arrowRight" className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}

export default PagesRoute;
