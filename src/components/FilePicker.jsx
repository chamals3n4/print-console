import Icon from "./Icon";
import { formatBytes } from "../lib/ui";

function FilePicker({
  doc,
  onPick,
  onRemove,
  accept = "application/pdf",
  multiple = false,
  prompt = "Click to choose a PDF",
}) {
  const handleChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    onPick(multiple ? files : files[0]);
    // Let the same file be picked again after a remove
    e.target.value = "";
  };

  return (
    <label className="block cursor-pointer rounded border border-dashed border-neutral-300 hover:border-blue-400 hover:bg-blue-50/30 transition-colors py-8 text-center">
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
      {doc ? (
        <div className="space-y-1">
          <Icon
            name="document"
            className="w-6 h-6 mx-auto text-blue-500"
            strokeWidth={1.5}
          />
          <p className="text-xs font-medium text-neutral-700 px-4 truncate">
            {doc.name}
          </p>
          <p className="text-[11px] text-neutral-400">
            {formatBytes(doc.size)}
          </p>
          {onRemove && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onRemove();
              }}
              className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-red-500 transition-colors mt-1"
            >
              <Icon name="close" className="w-3 h-3" />
              Remove
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <Icon
            name="upload"
            className="w-6 h-6 mx-auto text-neutral-300"
            strokeWidth={1.5}
          />
          <p className="text-xs text-neutral-400">{prompt}</p>
        </div>
      )}
    </label>
  );
}

export default FilePicker;
