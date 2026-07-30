const columns = ["left", "center", "right"];
const rows = ["top", "middle", "bottom"];

// One 3x3 grid instead of two rows of buttons — click where the image should sit
function PositionPicker({ alignH, alignV, onChange }) {
  return (
    <div className="inline-grid grid-cols-3 gap-1 p-1 rounded-lg border border-neutral-300 bg-white">
      {rows.map((v) =>
        columns.map((h) => {
          const active = alignH === h && alignV === v;
          return (
            <button
              key={`${v}-${h}`}
              onClick={() => onChange(h, v)}
              aria-label={`${v} ${h}`}
              title={`${v} ${h}`}
              className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                active ? "bg-neutral-900" : "hover:bg-neutral-100"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-sm ${active ? "bg-white" : "bg-neutral-300"}`}
              />
            </button>
          );
        }),
      )}
    </div>
  );
}

export default PositionPicker;
