import SegmentedControl from "./SegmentedControl";
import {
  fieldLabel,
  selectCls,
  selectArrow,
  cardCls,
  cardTitleCls,
  primaryBtnCls,
} from "../lib/ui";

const colorModes = [
  { value: "bw", label: "Black & White" },
  { value: "color", label: "Color" },
];

function PrintSettings({
  printers,
  loadingPrinters,
  selectedPrinter,
  setSelectedPrinter,
  mode,
  setMode,
  copies,
  setCopies,
  pages,
  setPages,
  onPrint,
  printing,
  canPrint,
}) {
  return (
    <div className={`${cardCls} space-y-4`}>
      <span className={cardTitleCls}>Print Settings</span>

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
        <SegmentedControl value={mode} onChange={setMode} options={colorModes} />
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
              onChange={(e) => setCopies(Math.max(1, Number(e.target.value) || 1))}
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

      <button onClick={onPrint} disabled={printing || !canPrint} className={primaryBtnCls}>
        {printing ? "Sending..." : "Print"}
      </button>
    </div>
  );
}

export default PrintSettings;
