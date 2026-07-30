// pdf-lib can only embed these two directly
const NATIVE_TYPES = ["image/png", "image/jpeg"];

async function toPngBytes(file, width, height) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("could not be converted");
  return new Uint8Array(await blob.arrayBuffer());
}

// Turns the pixels themselves by 90/180/270, so page layout needs no special
// case for rotated images — the width and height simply come back swapped.
export async function rotateImageBytes(bytes, type, rotation) {
  if (!rotation) return null;

  const blob = new Blob([bytes], { type });
  const bitmap = await createImageBitmap(blob);
  const turned = rotation === 90 || rotation === 270;

  const canvas = document.createElement("canvas");
  canvas.width = turned ? bitmap.height : bitmap.width;
  canvas.height = turned ? bitmap.width : bitmap.height;

  const ctx = canvas.getContext("2d");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  bitmap.close?.();

  // Keep photos as JPEG so they don't balloon into PNG
  const outType = type === "image/jpeg" ? "image/jpeg" : "image/png";
  const out = await new Promise((resolve) =>
    canvas.toBlob(resolve, outType, 0.92),
  );
  if (!out) throw new Error("could not be rotated");

  return {
    bytes: new Uint8Array(await out.arrayBuffer()),
    type: outType,
    width: canvas.width,
    height: canvas.height,
  };
}

// Decodes a picked image and returns everything the tool needs about it.
// Anything that isn't PNG or JPEG gets repainted as PNG first.
export async function loadImageFile(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`${file.name} is not an image this app can read`);
  }
  const width = bitmap.width;
  const height = bitmap.height;
  bitmap.close?.();

  const bytes = NATIVE_TYPES.includes(file.type)
    ? new Uint8Array(await file.arrayBuffer())
    : await toPngBytes(file, width, height);

  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    type: NATIVE_TYPES.includes(file.type) ? file.type : "image/png",
    width,
    height,
    bytes,
    rotation: 0,
    url: URL.createObjectURL(file),
  };
}
