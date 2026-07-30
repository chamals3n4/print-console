import { useState, useRef, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import DropZone from "../components/DropZone";
import ReorderRow from "../components/ReorderRow";
import SegmentedControl from "../components/SegmentedControl";
import PositionPicker from "../components/PositionPicker";
import PagePreview from "../components/PagePreview";
import StatusBanner from "../components/StatusBanner";
import PageHeader from "../components/PageHeader";
import Panel from "../components/Panel";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import { loadImageFile } from "../lib/image";
import { buildImagesPdf } from "../lib/pdf";
import { saveBytesAsDocument } from "../lib/document";
import {
  fieldLabel,
  selectCls,
  selectArrow,
  darkBtnCls,
  ghostBtnCls,
  chipCls,
  columnHeadCls,
} from "../lib/ui";

const fitModes = [
  { value: "fit", label: "Fit" },
  { value: "fill", label: "Fill" },
  { value: "actual", label: "Actual" },
];

const fitHelp = {
  fit: "Scaled to fit the page, whole image visible.",
  fill: "Scaled to cover the page, edges cropped off.",
  actual: "Left at its own size, centred on the page.",
};

function ImageToPdfRoute() {
  const { setDoc, status, setStatus } = useOutletContext();
  const navigate = useNavigate();

  const [images, setImages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [orientation, setOrientation] = useState("portrait");
  const [marginMm, setMarginMm] = useState(10);
  const [fit, setFit] = useState("fit");
  const [alignH, setAlignH] = useState("center");
  const [alignV, setAlignV] = useState("middle");
  const [busy, setBusy] = useState(false);

  // Every preview URL handed out, so they can all be released on the way out
  const urls = useRef(new Set());
  useEffect(
    () => () => urls.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );

  const handlePick = async (files) => {
    setStatus(null);
    const loaded = [];
    const failed = [];
    for (const file of files) {
      try {
        loaded.push(await loadImageFile(file));
      } catch (err) {
        failed.push(err.message ?? String(err));
      }
    }
    if (loaded.length > 0) {
      loaded.forEach((img) => urls.current.add(img.url));
      setImages((prev) => [...prev, ...loaded]);
      setSelectedId((prev) => prev ?? loaded[0].id);
    }
    if (failed.length > 0) {
      setStatus({ msg: `Skipped: ${failed.join(", ")}`, type: "error" });
    }
  };

  const move = (index, delta) => {
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });
  };

  const remove = (image) => {
    URL.revokeObjectURL(image.url);
    urls.current.delete(image.url);
    setImages((prev) => prev.filter((i) => i.id !== image.id));
    setSelectedId((prev) => (prev === image.id ? null : prev));
  };

  const rotate = (image, delta) => {
    setImages((prev) =>
      prev.map((i) =>
        i.id === image.id
          ? { ...i, rotation: (((i.rotation + delta) % 360) + 360) % 360 }
          : i,
      ),
    );
  };

  const clearAll = () => {
    images.forEach((image) => {
      URL.revokeObjectURL(image.url);
      urls.current.delete(image.url);
    });
    setImages([]);
    setSelectedId(null);
    setStatus(null);
  };

  const handleCreate = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const bytes = await buildImagesPdf(images, {
        orientation,
        marginMm,
        fit,
        alignH,
        alignV,
      });
      const name = images.length === 1 ? `${images[0].name}.pdf` : "images.pdf";
      setDoc(await saveBytesAsDocument(bytes, name));
      setStatus({
        msg: `Created a ${images.length}-page PDF. Ready to print.`,
        type: "success",
      });
      navigate("/");
    } catch (err) {
      setStatus({ msg: `Could not create PDF: ${err}`, type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const selected = images.find((i) => i.id === selectedId) ?? images[0] ?? null;

  return (
    <>
      <div className="w-[380px] shrink-0 flex flex-col bg-white border-r border-neutral-200">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2">
          <span className={columnHeadCls}>Images</span>
          {images.length > 0 && (
            <div className="flex items-center gap-2">
              <span className={chipCls}>
                {images.length} page{images.length === 1 ? "" : "s"}
              </span>
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
            accept="image/*"
            multiple
            icon="image"
            title="Add images"
            hint="PNG or JPEG · pick several at once"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
          {images.length === 0 ? (
            <EmptyState icon="image" message="No images added yet" />
          ) : (
            images.map((image, index) => (
              <ReorderRow
                key={image.id}
                isFirst={index === 0}
                isLast={index === images.length - 1}
                onMoveUp={() => move(index, -1)}
                onMoveDown={() => move(index, 1)}
                onRemove={() => remove(image)}
              >
                <button
                  onClick={() => setSelectedId(image.id)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                >
                  <img
                    src={image.url}
                    alt=""
                    className={`w-9 h-9 object-cover rounded-md border-2 transition-transform ${
                      selected?.id === image.id
                        ? "border-neutral-900"
                        : "border-transparent"
                    }`}
                    style={{ transform: `rotate(${image.rotation}deg)` }}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-neutral-800 truncate">
                      {image.name}
                    </span>
                    <span className="block text-[10px] text-neutral-400 tabular-nums">
                      Page {index + 1}
                      {image.rotation !== 0 && ` · turned ${image.rotation}°`}
                    </span>
                  </span>
                </button>
              </ReorderRow>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            <PageHeader
              title="Image to PDF"
              description="Turn photos and screenshots into a print-ready PDF, one image per page."
            />

            <StatusBanner status={status} />

            <Panel
              title="Page layout"
              description="Applies to every image in the list."
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={fieldLabel}>Size on the page</label>
                    <SegmentedControl value={fit} onChange={setFit} options={fitModes} />
                  </div>
                  <div>
                    <label className={fieldLabel}>Orientation</label>
                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value)}
                      className={selectCls}
                      style={selectArrow}
                    >
                      <option value="auto">Auto (match image)</option>
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-400 -mt-1">{fitHelp[fit]}</p>

                <div className="flex items-start gap-5 border-t border-neutral-200 pt-4">
                  <div>
                    <label className={fieldLabel}>Position</label>
                    <PositionPicker
                      alignH={alignH}
                      alignV={alignV}
                      onChange={(h, v) => {
                        setAlignH(h);
                        setAlignV(v);
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className={fieldLabel}>
                      Margin ·{" "}
                      <span className="tabular-nums text-neutral-900">
                        {marginMm} mm
                      </span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={marginMm}
                      onChange={(e) => setMarginMm(Number(e.target.value))}
                      disabled={fit === "actual"}
                      className="w-full accent-neutral-900 disabled:opacity-40"
                    />
                    <p className="mt-1.5 text-[11px] text-neutral-400">
                      Gap kept between the image and the paper edge.
                    </p>
                  </div>
                </div>

              </div>
            </Panel>

            <Panel
              title="Preview"
              description={
                selected
                  ? `${selected.name} — exactly how this page will come out.`
                  : "Exactly how the page will come out of the printer."
              }
              action={
                selected && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => rotate(selected, -90)}
                      title="Rotate left"
                      aria-label="Rotate left"
                      className={`${ghostBtnCls} px-2`}
                    >
                      <Icon name="rotateLeft" className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => rotate(selected, 90)}
                      title="Rotate right"
                      aria-label="Rotate right"
                      className={`${ghostBtnCls} px-2`}
                    >
                      <Icon name="rotateRight" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              }
            >
              {selected ? (
                <PagePreview
                  image={selected}
                  orientation={orientation}
                  marginMm={marginMm}
                  fit={fit}
                  alignH={alignH}
                  alignV={alignV}
                />
              ) : (
                <EmptyState
                  icon="image"
                  message="Add an image to see how it sits on the page"
                />
              )}
            </Panel>
          </div>
        </div>

        {/* Stays in view while scrolling the options */}
        <div className="shrink-0 border-t border-neutral-200 bg-white/90 backdrop-blur px-6 py-3 flex items-center justify-between gap-4">
          <p className="text-[11px] text-neutral-500 tabular-nums">
            {images.length === 0
              ? "No images added"
              : `${images.length} image${images.length === 1 ? "" : "s"} · A4 ${orientation === "auto" ? "auto" : orientation}`}
          </p>
          <button
            onClick={handleCreate}
            disabled={busy || images.length === 0}
            className={darkBtnCls}
          >
            {busy ? "Creating..." : "Create PDF & print"}
            {!busy && <Icon name="arrowRight" className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </>
  );
}

export default ImageToPdfRoute;
