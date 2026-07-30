import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import DropZone from "../components/DropZone";
import ReorderRow from "../components/ReorderRow";
import StatusBanner from "../components/StatusBanner";
import PageHeader from "../components/PageHeader";
import Panel from "../components/Panel";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import { mergePdfs, countPages } from "../lib/pdf";
import { saveFileAsDocument, saveBytesAsDocument } from "../lib/document";
import {
  darkBtnCls,
  chipCls,
  columnHeadCls,
  formatBytes,
} from "../lib/ui";

function MergeRoute() {
  const { setDoc, status, setStatus } = useOutletContext();
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0);

  // Every page of every file, flattened into the order they will be printed
  const mergedPages = files.flatMap((file, fileIndex) =>
    Array.from({ length: file.pageCount }, (_, i) => ({
      fileId: file.id,
      fileName: file.name,
      fileIndex,
      pageInFile: i + 1,
      thumb: file.thumbs[i] ?? null,
    })),
  ).map((page, i) => ({ ...page, number: i + 1 }));

  const handlePick = async (picked) => {
    setStatus(null);
    const loaded = [];
    const failed = [];

    for (const file of picked) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const pageCount = await countPages(bytes);
        // Saved so the Rust side can render every page for the preview
        const saved = await saveFileAsDocument(file);
        let thumbs = [];
        try {
          thumbs = await invoke("preview_pages", {
            filePath: saved.path,
            from: 1,
            to: pageCount,
          });
        } catch {
          // Missing thumbnails shouldn't stop the merge
        }
        loaded.push({
          id: `${file.name}-${file.lastModified}-${loaded.length}`,
          name: file.name,
          size: file.size,
          bytes,
          pageCount,
          thumbs,
        });
      } catch (err) {
        failed.push(`${file.name} (${err})`);
      }
    }

    if (loaded.length > 0) setFiles((prev) => [...prev, ...loaded]);
    if (failed.length > 0) {
      setStatus({ msg: `Could not read: ${failed.join(", ")}`, type: "error" });
    }
  };

  const move = (index, delta) => {
    setFiles((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });
  };

  const remove = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const clearAll = () => {
    setFiles([]);
    setStatus(null);
  };

  const handleMerge = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const bytes = await mergePdfs(files);
      setDoc(await saveBytesAsDocument(bytes, "merged.pdf"));
      setStatus({
        msg: `Merged ${files.length} files into ${totalPages} pages. Ready to print.`,
        type: "success",
      });
      navigate("/");
    } catch (err) {
      setStatus({ msg: `Merge failed: ${err}`, type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="w-[380px] shrink-0 flex flex-col bg-white border-r border-neutral-200">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2">
          <span className={columnHeadCls}>Source PDFs</span>
          {files.length > 0 && (
            <div className="flex items-center gap-2">
              <span className={chipCls}>{files.length} files</span>
              <button
                onClick={clearAll}
                className="text-[11px] font-medium text-neutral-400 hover:text-red-600 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="px-4 pb-3">
          <DropZone
            onPick={handlePick}
            multiple
            icon="stack"
            title="Add PDFs"
            hint="Pick several at once"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
          {files.length === 0 ? (
            <EmptyState icon="stack" message="No PDFs added yet" />
          ) : (
            files.map((file, index) => (
              <ReorderRow
                key={file.id}
                isFirst={index === 0}
                isLast={index === files.length - 1}
                onMoveUp={() => move(index, -1)}
                onMoveDown={() => move(index, 1)}
                onRemove={() => remove(file.id)}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="w-6 h-6 shrink-0 rounded-md bg-neutral-900 text-white text-[11px] font-semibold flex items-center justify-center tabular-nums">
                    {index + 1}
                  </span>
                  {file.thumbs[0] ? (
                    <img
                      src={file.thumbs[0]}
                      alt=""
                      className="w-8 h-10 object-cover rounded border border-neutral-200 bg-white"
                    />
                  ) : (
                    <div className="w-8 h-10 rounded border border-neutral-200 bg-neutral-50" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-800 truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-neutral-500 tabular-nums">
                      {file.pageCount} page{file.pageCount === 1 ? "" : "s"} ·{" "}
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>
              </ReorderRow>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            <PageHeader
              title="Merge PDFs"
              description="Combine several PDFs into one document, in the order you choose."
            />

            <StatusBanner status={status} />

            <Panel
              title="Merged preview"
              description={
                files.length === 0
                  ? "Every page, in the order it will be printed."
                  : `${totalPages} pages from ${files.length} file${files.length === 1 ? "" : "s"}, in the order they will print.`
              }
            >
              {mergedPages.length === 0 ? (
                <EmptyState icon="stack" message="Add two or more PDFs to merge" />
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
                  {mergedPages.map((page) => (
                    <div
                      key={`${page.fileId}-${page.pageInFile}`}
                      className="rounded-lg border border-neutral-300 bg-white p-2"
                      title={`${page.fileName} — page ${page.pageInFile}`}
                    >
                      {page.thumb ? (
                        <img
                          src={page.thumb}
                          alt={`Page ${page.number}`}
                          className="w-full rounded border border-neutral-100"
                        />
                      ) : (
                        <div className="w-full aspect-[1/1.41] rounded bg-neutral-50 border border-neutral-100" />
                      )}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="text-xs font-medium text-neutral-700 tabular-nums">
                          Page {page.number}
                        </span>
                        <span className="w-5 h-5 shrink-0 rounded bg-neutral-100 text-[10px] font-semibold text-neutral-500 flex items-center justify-center tabular-nums">
                          {page.fileIndex + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>

        <div className="shrink-0 border-t border-neutral-200 bg-white/90 backdrop-blur px-6 py-3 flex items-center justify-between gap-4">
          <p className="text-[11px] text-neutral-500 tabular-nums">
            {files.length < 2
              ? "Add at least two PDFs to merge"
              : `${files.length} files · ${totalPages} pages`}
          </p>
          <button
            onClick={handleMerge}
            disabled={busy || files.length < 2}
            className={darkBtnCls}
          >
            {busy ? "Merging..." : "Merge & print"}
            {!busy && <Icon name="arrowRight" className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </>
  );
}

export default MergeRoute;
