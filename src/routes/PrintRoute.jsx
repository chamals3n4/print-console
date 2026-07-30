import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import Icon from "../components/Icon";
import DropZone from "../components/DropZone";
import PdfPreview from "../components/PdfPreview";
import PrintSettings from "../components/PrintSettings";
import PrintQueue from "../components/PrintQueue";
import StatusBanner from "../components/StatusBanner";
import { saveFileAsDocument } from "../lib/document";
import { A4 } from "../lib/layout";
import { secondaryBtnCls } from "../lib/ui";

function PrintRoute() {
  const {
    doc,
    setDoc,
    printers,
    loadingPrinters,
    selectedPrinter,
    setSelectedPrinter,
    status,
    setStatus,
  } = useOutletContext();

  const [copies, setCopies] = useState(1);
  const [mode, setMode] = useState("bw");
  const [pages, setPages] = useState("all");
  const [printing, setPrinting] = useState(false);
  const [queueKey, setQueueKey] = useState(0);

  const handlePick = async (file) => {
    setStatus(null);
    try {
      setDoc(await saveFileAsDocument(file));
    } catch (err) {
      setStatus({ msg: `Failed to save file: ${err}`, type: "error" });
    }
  };

  const handleRemove = () => {
    setDoc(null);
    setStatus(null);
  };

  const handleOpenPdf = async () => {
    if (!doc) return;
    try {
      await invoke("open_pdf", { filePath: doc.path });
    } catch (err) {
      setStatus({ msg: `Could not open file: ${err}`, type: "error" });
    }
  };

  const handlePrint = async () => {
    if (!doc) {
      setStatus({ msg: "Please select a PDF file first.", type: "error" });
      return;
    }
    setPrinting(true);
    setStatus(null);
    try {
      const result = await invoke("print_pdf", {
        filePath: doc.path,
        printer: selectedPrinter,
        copies: Number(copies),
        color: mode === "color",
        pages,
        paper: A4.media,
      });
      setStatus({ msg: result, type: "success" });
      setQueueKey((k) => k + 1);
    } catch (err) {
      setStatus({ msg: `Print failed: ${err}`, type: "error" });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <>
      <div className="w-[440px] shrink-0 flex flex-col bg-white border-r border-neutral-200">
        <div className="p-4 pb-3 border-b border-neutral-100">
          <DropZone
            doc={doc}
            onPick={handlePick}
            onRemove={handleRemove}
            icon="document"
            title="Choose a PDF"
            hint="Click to browse"
          />
        </div>
        {/* pdf preview*/}
        <div className="flex-1 flex flex-col p-4 pt-3 min-h-0">
          {doc ? (
            <PdfPreview
              key={`${doc.path}:${pages}`}
              filePath={doc.path}
              pages={pages}
            />
          ) : (
            <div className="flex-1 rounded-xl border border-neutral-300 bg-white overflow-hidden flex items-center justify-center min-h-0">
              <p className="text-xs text-neutral-300">Preview appears here</p>
            </div>
          )}
          <button
            onClick={handleOpenPdf}
            disabled={!doc}
            className={`mt-2.5 ${secondaryBtnCls}`}
          >
            <Icon name="external" className="w-3 h-3" />
            Open with system viewer
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            <StatusBanner status={status} />
            <PrintSettings
              printers={printers}
              loadingPrinters={loadingPrinters}
              selectedPrinter={selectedPrinter}
              setSelectedPrinter={setSelectedPrinter}
              mode={mode}
              setMode={setMode}
              copies={copies}
              setCopies={setCopies}
              pages={pages}
              setPages={setPages}
              onPrint={handlePrint}
              printing={printing}
              canPrint={!!doc}
            />
            <PrintQueue refreshKey={queueKey} onStatus={setStatus} />
          </div>
        </div>
      </div>
    </>
  );
}

export default PrintRoute;
