import {
  pageDimensions,
  layoutImage,
  orientedSize,
  effectiveDpi,
  LOW_DPI,
} from "../lib/layout";

// Shows the image on the page exactly where the generated PDF will put it,
// since both call the same layout maths.
function PagePreview({ image, orientation, marginMm, fit, alignH, alignV }) {
  const rotation = image.rotation ?? 0;
  const size = orientedSize(image.width, image.height, rotation);

  const page = pageDimensions(orientation, size.width / size.height);
  const box = layoutImage({
    imageWidth: size.width,
    imageHeight: size.height,
    page,
    marginMm,
    fit,
    alignH,
    alignV,
  });
  const dpi = effectiveDpi(size.width, box.width);

  const pct = (n, of) => `${(n / of) * 100}%`;
  const turned = rotation === 90 || rotation === 270;

  return (
    <div className="space-y-2.5">
      <div className="h-[380px] flex items-center justify-center overflow-hidden">
        <div
          className="relative h-full max-w-full bg-white border border-neutral-300 overflow-hidden"
          style={{ aspectRatio: `${page.width} / ${page.height}` }}
        >
          {/* Box is the final footprint; the image spins inside it */}
          <div
            className="absolute"
            style={{
              left: pct(box.x, page.width),
              // PDF measures y from the bottom, CSS from the top
              top: pct(page.height - box.y - box.height, page.height),
              width: pct(box.width, page.width),
              height: pct(box.height, page.height),
            }}
          >
            <img
              src={image.url}
              alt={image.name}
              className="absolute left-1/2 top-1/2"
              style={{
                // On a quarter turn the sides trade places, so the element is
                // sized swapped and the rotation lands it back inside the box
                width: turned ? pct(box.height, box.width) : "100%",
                height: turned ? pct(box.width, box.height) : "100%",
                maxWidth: "none",
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="text-center text-[11px] text-neutral-400 tabular-nums">
        {size.width} × {size.height} px · prints at ~{dpi} DPI
      </div>

      {dpi < LOW_DPI && (
        <div className="px-3 py-2 rounded text-[11px] font-medium border bg-amber-50 text-amber-700 border-amber-200">
          This image is small for the page — at ~{dpi} DPI it will look soft in
          print. Under {LOW_DPI} DPI is noticeable on photos and fine text.
        </div>
      )}
    </div>
  );
}

export default PagePreview;
