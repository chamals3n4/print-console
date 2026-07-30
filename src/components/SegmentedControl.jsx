function SegmentedControl({ value, onChange, options }) {
  return (
    <div className="flex">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-1.5 text-xs font-medium border transition-colors first:rounded-l last:rounded-r ${
            value === opt.value
              ? "bg-blue-500 border-blue-500 text-white"
              : "bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;
