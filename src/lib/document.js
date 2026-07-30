import { invoke } from "@tauri-apps/api/core";

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

export async function saveFileAsDocument(file) {
  const fileData = await readFileAsBase64(file);
  const path = await invoke("save_temp_file", {
    fileData,
    fileName: file.name,
  });
  return { path, name: file.name, size: file.size };
}

export async function saveBytesAsDocument(bytes, fileName) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const path = await invoke("save_temp_file", {
    fileData: btoa(binary),
    fileName,
  });
  return { path, name: fileName, size: bytes.length };
}
