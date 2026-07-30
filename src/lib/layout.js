export const MM_TO_PT = 72 / 25.4;

// The only paper this shop prints on. Size is in PDF points; `media` is the
// name CUPS knows it by.
export const A4 = { label: "A4", width: 595.28, height: 841.89, media: "A4" };

// What we assume when an image carries no DPI of its own
const ASSUMED_DPI = 96;

// Under this, print quality starts looking soft
export const LOW_DPI = 150;

// A quarter turn swaps how wide and tall the image effectively is
export function orientedSize(width, height, rotation) {
  return rotation === 90 || rotation === 270
    ? { width: height, height: width }
    : { width, height };
}

export function pageDimensions(orientation, imageAspect) {
  const landscape =
    orientation === "auto" ? imageAspect > 1 : orientation === "landscape";
  return landscape
    ? { width: A4.height, height: A4.width }
    : { width: A4.width, height: A4.height };
}

// Where the image sits on the page, in points. Shared by the preview and the
// generated PDF so what you see is what gets printed.
export function layoutImage({
  imageWidth,
  imageHeight,
  page,
  marginMm,
  fit,
  alignH = "center",
  alignV = "middle",
}) {
  const margin = marginMm * MM_TO_PT;
  const boxWidth = Math.max(1, page.width - margin * 2);
  const boxHeight = Math.max(1, page.height - margin * 2);

  let scale;
  if (fit === "fill") {
    // Cover the page and let the overflow fall outside it
    scale = Math.max(boxWidth / imageWidth, boxHeight / imageHeight);
  } else if (fit === "actual") {
    scale = 72 / ASSUMED_DPI;
  } else {
    scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
  }

  const width = imageWidth * scale;
  const height = imageHeight * scale;

  let x = (page.width - width) / 2;
  if (alignH === "left") x = margin;
  if (alignH === "right") x = page.width - margin - width;

  // PDF measures y from the bottom of the page
  let y = (page.height - height) / 2;
  if (alignV === "top") y = page.height - margin - height;
  if (alignV === "bottom") y = margin;

  return { width, height, x, y };
}

// The resolution the image will actually print at
export function effectiveDpi(imageWidth, drawnWidthPt) {
  if (drawnWidthPt <= 0) return 0;
  return Math.round((imageWidth * 72) / drawnWidthPt);
}
