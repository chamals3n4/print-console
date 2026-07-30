import { formatBytes } from "../lib/ui";

const statusColor = (status) => {
  const s = status.toLowerCase();
  if (s.includes("printing") || s.includes("sending")) return "#2563eb";
  if (s.includes("complete") || s.includes("done")) return "#16a34a";
  if (s.includes("error") || s.includes("failed")) return "#dc2626";
  return "#d97706";
};

function ProgressBar({ status }) {
  const s = status.toLowerCase();
  if (s.includes("printing")) {
    return (
      <div className="h-1 rounded-full bg-neutral-200 overflow-hidden">
        <div className="h-full rounded-full bg-blue-500 animate-pulse w-3/4" />
      </div>
    );
  }
  if (s.includes("complete")) {
    return (
      <div className="h-1 rounded-full bg-emerald-200 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500 w-full" />
      </div>
    );
  }
  return (
    <div className="h-1 rounded-full bg-neutral-200 overflow-hidden">
      <div className="h-full rounded-full bg-amber-400 w-1/3" />
    </div>
  );
}

function JobRow({ job, isCancelling, isArmed, onArm, onDismiss, onCancel }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded border border-neutral-100 bg-neutral-50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-700">Job #{job.id}</span>
          <span className="text-[10px] text-neutral-400">{job.printer}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-[11px] font-medium capitalize"
            style={{ color: statusColor(job.status) }}
          >
            {job.status || "pending"}
          </span>
          <span className="text-[10px] text-neutral-400">
            · {formatBytes(job.size_bytes)}
          </span>
        </div>
      </div>

      <div className="w-16 shrink-0">
        <ProgressBar status={job.status} />
      </div>

      {/* Two clicks to cancel, so no job dies by accident */}
      <div className="w-14 shrink-0 flex justify-end">
        {isCancelling ? (
          <span className="text-[10px] text-neutral-400">Cancelling…</span>
        ) : isArmed ? (
          <div className="flex items-center gap-1">
            <button
              onClick={onCancel}
              className="text-[10px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded px-1.5 py-0.5 transition-colors"
            >
              Sure?
            </button>
            <button
              onClick={onDismiss}
              aria-label="Keep job"
              className="text-[10px] text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={onArm}
            className="text-[10px] text-neutral-400 hover:text-red-500 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default JobRow;
