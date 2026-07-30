import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import Layout from "./components/Layout";
import PrintRoute from "./routes/PrintRoute";
import ImageToPdfRoute from "./routes/ImageToPdfRoute";
import MergeRoute from "./routes/MergeRoute";
import PagesRoute from "./routes/PagesRoute";

function App() {
  // The document every route works on, so a tool can hand its result to Print
  const [doc, setDoc] = useState(null);
  const [status, setStatus] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(true);
  const [selectedPrinter, setSelectedPrinter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const result = await invoke("list_printers");
        setPrinters(result);
        if (result.length > 0) setSelectedPrinter(result[0].name);
      } catch {
        setStatus({
          msg: "Could not detect printers. Is CUPS running?",
          type: "error",
        });
      } finally {
        setLoadingPrinters(false);
      }
    })();
  }, []);

  const shared = {
    doc,
    setDoc,
    status,
    setStatus,
    printers,
    loadingPrinters,
    selectedPrinter,
    setSelectedPrinter,
  };

  return (
    <Routes>
      <Route element={<Layout shared={shared} />}>
        <Route index element={<PrintRoute />} />
        <Route path="image-to-pdf" element={<ImageToPdfRoute />} />
        <Route path="merge" element={<MergeRoute />} />
        <Route path="pages" element={<PagesRoute />} />
      </Route>
    </Routes>
  );
}

export default App;
