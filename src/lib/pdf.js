import { PDFDocument } from "pdf-lib";
import { invoke } from "@tauri-apps/api/core";
import { pageDimensions, layoutImage } from "./layout";
import { rotateImageBytes } from "./image";

// Customer PDFs are sometimes protected, and we only ever read them
const LOAD_OPTS = { ignoreEncryption: true };

export function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Pulls a saved document back off disk so pdf-lib can work on it
export async function readDocumentBytes(filePath) {
  return base64ToBytes(await invoke("read_file_base64", { filePath }));
}

export async function countPages(bytes) {
  const doc = await PDFDocument.load(bytes, LOAD_OPTS);
  return doc.getPageCount();
}

// One image per page, positioned by the same maths the preview uses
export async function buildImagesPdf(
  images,
  { orientation, marginMm, fit, alignH, alignV },
) {
  const pdf = await PDFDocument.create();

  for (const image of images) {
    // Rotating the pixels first keeps the placement maths below unchanged
    const turned = await rotateImageBytes(image.bytes, image.type, image.rotation);
    const source = turned ?? image;

    const embedded =
      source.type === "image/png"
        ? await pdf.embedPng(source.bytes)
        : await pdf.embedJpg(source.bytes);

    const page = pageDimensions(orientation, source.width / source.height);
    const box = layoutImage({
      imageWidth: source.width,
      imageHeight: source.height,
      page,
      marginMm,
      fit,
      alignH,
      alignV,
    });

    pdf.addPage([page.width, page.height]).drawImage(embedded, {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    });
  }

  return pdf.save();
}

export async function mergePdfs(sources) {
  const out = await PDFDocument.create();

  for (const source of sources) {
    const doc = await PDFDocument.load(source.bytes, LOAD_OPTS);
    const pages = await out.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => out.addPage(page));
  }

  return out.save();
}

// Builds a new PDF from the kept pages, in order. `keep` is [{ index }].
export async function applyPageEdits(bytes, keep) {
  const source = await PDFDocument.load(bytes, LOAD_OPTS);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(
    source,
    keep.map((k) => k.index),
  );

  pages.forEach((page) => out.addPage(page));

  return out.save();
}
