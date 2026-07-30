import Icon from "./Icon";
import { formatBytes } from "../lib/ui";

function DropZone({
  doc,
  onPick,
  onRemove,
  accept = "application/pdf",
  multiple = false,
  icon = "upload",
  title,
  hint,
}) {
  const handleChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    onPick(multiple ? files : files[0]);
    // Let the same file be picked again later
    e.target.value = "";
  };

  const circleCls =
    "w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center border transition-colors";

  return (
    <label
      className={`group block cursor-pointer rounded-xl border border-dashed border-neutral-300 py-7 px-4 text-center transition-colors ${
        doc
          ? "bg-white"
          : "bg-neutral-50/50 hover:border-blue-500 hover:bg-blue-50/40"
      }`}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />

      {doc ? (
        <>
          <span
            className={`${circleCls} bg-blue-50 border-blue-200 text-blue-500`}
          >
            <Icon name="document" className="w-4 h-4" strokeWidth={1.75} />
          </span>
          <span className="block text-sm font-medium text-neutral-800 truncate px-4">
            {doc.name}
          </span>
          <span className="block text-xs text-neutral-500 mt-0.5 tabular-nums">
            {formatBytes(doc.size)}
          </span>
          {onRemove && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onRemove();
              }}
              className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Icon name="close" className="w-3 h-3" />
              Remove
            </button>
          )}
        </>
      ) : (
        <>
          <span
            className={`${circleCls} bg-white border-neutral-200 text-neutral-400 group-hover:border-blue-300 group-hover:text-blue-500`}
          >
            <Icon name={icon} className="w-4 h-4" strokeWidth={1.75} />
          </span>
          <span className="block text-sm font-medium text-neutral-700 group-hover:text-blue-700 transition-colors">
            {title}
          </span>
          {hint && (
            <span className="block text-xs text-neutral-400 mt-0.5">
              {hint}
            </span>
          )}
        </>
      )}
    </label>
  );
}

export default DropZone;
