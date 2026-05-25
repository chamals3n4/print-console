import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [tempFilePath, setTempFilePath] = useState(null);
  const [copies, setCopies] = useState(1);
  const [mode, setMode] = useState("bw");
  const [pages, setPages] = useState("all");
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [printers, setPrinters] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const jobsInterval = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await invoke("list_printers");
        setPrinters(result);
        if (result.length > 0) setSelectedPrinter(result[0].name);
      } catch {
        setStatusMsg("Could not detect printers. Is CUPS running?");
        setStatusType("error");
      } finally {
        setLoadingPrinters(false);
      }
    })();
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const result = await invoke("list_print_jobs");
      setJobs(result);
    } catch {
      // silently fail
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    jobsInterval.current = setInterval(fetchJobs, 3000);
    return () => clearInterval(jobsInterval.current);
  }, [fetchJobs]);

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setTempFilePath(null);
    setPreviewImage(null);
    setStatusMsg("");
    setStatusType("");
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setStatusMsg("");
    setStatusType("");
    setTempFilePath(null);
    setPreviewImage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result.split(",")[1];
      try {
        const path = await invoke("save_temp_file", {
          fileData: base64Data,
          fileName: file.name,
        });
        setTempFilePath(path);
      } catch (err) {
        setStatusMsg(`Failed to save file: ${err}`);
        setStatusType("error");
      }
    };
    reader.onerror = () => {
      setStatusMsg("Failed to read file.");
      setStatusType("error");
    };
    reader.readAsDataURL(file);
  };

  const handleOpenPdf = async () => {
    if (!tempFilePath) return;
    try {
      await invoke("open_pdf", { filePath: tempFilePath });
    } catch (err) {
      setStatusMsg(`Could not open file: ${err}`);
      setStatusType("error");
    }
  };

  const handlePrint = async () => {
    if (!tempFilePath) {
      setStatusMsg("Please select a PDF file first.");
      setStatusType("error");
      return;
    }
    setPrinting(true);
    setStatusMsg("");
    setStatusType("");
    try {
      const result = await invoke("print_pdf", {
        filePath: tempFilePath,
        printer: selectedPrinter,
        copies: Number(copies),
        color: mode === "color",
        pages,
      });
      setStatusMsg(result);
      setStatusType("success");
      fetchJobs();
    } catch (err) {
      setStatusMsg(`Print failed: ${err}`);
      setStatusType("error");
    } finally {
      setPrinting(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const jobStatusColor = (status) => {
    const s = status.toLowerCase();
    if (s.includes("printing") || s.includes("sending")) return "#2563eb";
    if (s.includes("complete") || s.includes("done")) return "#16a34a";
    if (s.includes("error") || s.includes("failed")) return "#dc2626";
    return "#d97706";
  };

  const fieldLabel = "block text-xs font-medium text-neutral-600 mb-1.5";
  const inputBase =
    "w-full h-8 px-2.5 text-xs border border-neutral-300 rounded bg-white text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20";
  const selectCls = `${inputBase} appearance-none cursor-pointer pr-7`;
  const selectArrow = {
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2373737a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: "right 0.5rem center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "1.25em",
  };

  useEffect(() => {
    if (!tempFilePath) {
      setPreviewImage(null);
      return;
    }
    let cancelled = false;
    const page = pages === "even" ? 2 : 1;
    (async () => {
      try {
        const img = await invoke("preview_page", {
          filePath: tempFilePath,
          page,
        });
        if (!cancelled) setPreviewImage(img);
      } catch {
        if (!cancelled) setPreviewImage(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tempFilePath, pages]);

  return (
    <div className="h-screen flex flex-col bg-neutral-100 font-sans antialiased">
      <header className="flex items-center justify-between px-5 py-2 border-b border-neutral-200 bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <svg
            className="w-4 h-4 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          <span className="text-xs font-semibold text-neutral-700">
            Print Console
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          <span
            className={`w-1.5 h-1.5 rounded-full ${printers.length > 0 ? "bg-emerald-500" : "bg-red-400"}`}
          />
          {printers.length > 0
            ? `${printers.length} printer${printers.length > 1 ? "s" : ""} online`
            : "No printers"}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[440px] shrink-0 flex flex-col bg-white border-r border-neutral-200">
          <div className="p-4 pb-3 border-b border-neutral-100">
            <label className="block cursor-pointer rounded border border-dashed border-neutral-300 hover:border-blue-400 hover:bg-blue-50/30 transition-colors py-8 text-center">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFile}
                className="hidden"
              />
              {selectedFile ? (
                <div className="space-y-1">
                  <svg
                    className="w-6 h-6 mx-auto text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-xs font-medium text-neutral-700 px-4 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {formatBytes(selectedFile.size)}
                  </p>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemoveFile();
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-red-500 transition-colors mt-1"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <svg
                    className="w-6 h-6 mx-auto text-neutral-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-xs text-neutral-400">
                    Click to choose a PDF
                  </p>
                </div>
              )}
            </label>
          </div>
          {/* pdf preview*/}
          <div className="flex-1 flex flex-col p-4 pt-3 min-h-0">
            <div className="flex-1 rounded border border-neutral-200 bg-white shadow-sm overflow-hidden flex items-center justify-center min-h-0">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="PDF preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <p className="text-xs text-neutral-300">Preview appears here</p>
              )}
            </div>
            <button
              onClick={handleOpenPdf}
              disabled={!tempFilePath}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium text-neutral-600 border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Open with system viewer
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-5">
              {/* Status */}
              {statusMsg && (
                <div
                  className={`px-3 py-2 rounded text-xs font-medium border ${
                    statusType === "error"
                      ? "bg-red-50 text-red-600 border-red-200"
                      : "bg-emerald-50 text-emerald-600 border-emerald-200"
                  }`}
                >
                  {statusMsg}
                </div>
              )}

              <div className="bg-white rounded border border-neutral-200 p-4 space-y-4">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Print Settings
                </span>

                <div>
                  <label className={fieldLabel}>Printer</label>
                  {loadingPrinters ? (
                    <div className="h-8 rounded bg-neutral-100 animate-pulse" />
                  ) : printers.length === 0 ? (
                    <p className="text-xs text-red-500">No printers found.</p>
                  ) : (
                    <select
                      value={selectedPrinter}
                      onChange={(e) => setSelectedPrinter(e.target.value)}
                      className={selectCls}
                      style={selectArrow}
                    >
                      {printers.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name} — {p.status}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className={fieldLabel}>Color Mode</label>
                  <div className="flex">
                    {[
                      { value: "bw", label: "Black & White" },
                      { value: "color", label: "Color" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setMode(opt.value)}
                        className={`flex-1 py-1.5 text-xs font-medium border transition-colors first:rounded-l last:rounded-r ${
                          mode === opt.value
                            ? "bg-blue-500 border-blue-500 text-white"
                            : "bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={fieldLabel}>Copies</label>
                    <div className="flex">
                      <button
                        onClick={() => setCopies(Math.max(1, copies - 1))}
                        className="w-7 h-8 flex items-center justify-center text-sm border border-neutral-300 rounded-l bg-white hover:bg-neutral-50 text-neutral-500"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={copies}
                        min={1}
                        max={99}
                        onChange={(e) =>
                          setCopies(Math.max(1, Number(e.target.value) || 1))
                        }
                        className="w-12 h-8 text-center border-y border-neutral-300 text-xs text-neutral-700 focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => setCopies(Math.min(99, copies + 1))}
                        className="w-7 h-8 flex items-center justify-center text-sm border border-neutral-300 rounded-r bg-white hover:bg-neutral-50 text-neutral-500"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={fieldLabel}>Pages</label>
                    <select
                      value={pages}
                      onChange={(e) => setPages(e.target.value)}
                      className={selectCls}
                      style={selectArrow}
                    >
                      <option value="all">All Pages</option>
                      <option value="odd">Odd Only</option>
                      <option value="even">Even Only</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handlePrint}
                  disabled={printing || !tempFilePath}
                  className="w-full py-2 rounded text-xs font-semibold bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {printing ? "Sending..." : "Print"}
                </button>
              </div>

              <div className="bg-white rounded border border-neutral-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Print Queue
                  </span>
                  <button
                    onClick={fetchJobs}
                    className="text-[11px] text-neutral-400 hover:text-neutral-600 transition-colors flex items-center gap-1"
                  >
                    <svg
                      className={`w-3 h-3 ${loadingJobs ? "animate-spin" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Refresh
                  </button>
                </div>

                {jobs.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-neutral-200 rounded">
                    <p className="text-xs text-neutral-400">
                      No active print jobs
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {jobs.map((job) => (
                      <div
                        key={`${job.printer}-${job.id}`}
                        className="flex items-center gap-3 px-3 py-2.5 rounded border border-neutral-100 bg-neutral-50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-neutral-700">
                              Job #{job.id}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              {job.printer}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="text-[11px] font-medium capitalize"
                              style={{ color: jobStatusColor(job.status) }}
                            >
                              {job.status || "pending"}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              · {formatBytes(job.size_bytes)}
                            </span>
                          </div>
                        </div>
                        <div className="w-16 shrink-0">
                          {job.status.toLowerCase().includes("printing") ? (
                            <div className="h-1 rounded-full bg-neutral-200 overflow-hidden">
                              <div className="h-full rounded-full bg-blue-500 animate-pulse w-3/4" />
                            </div>
                          ) : job.status.toLowerCase().includes("complete") ? (
                            <div className="h-1 rounded-full bg-emerald-200 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500 w-full" />
                            </div>
                          ) : (
                            <div className="h-1 rounded-full bg-neutral-200 overflow-hidden">
                              <div className="h-full rounded-full bg-amber-400 w-1/3" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
