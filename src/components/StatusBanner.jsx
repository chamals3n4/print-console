function StatusBanner({ status }) {
  if (!status?.msg) return null;

  return (
    <div
      className={`px-3 py-2 rounded text-xs font-medium border ${
        status.type === "error"
          ? "bg-red-50 text-red-600 border-red-200"
          : "bg-emerald-50 text-emerald-600 border-emerald-200"
      }`}
    >
      {status.msg}
    </div>
  );
}

export default StatusBanner;
