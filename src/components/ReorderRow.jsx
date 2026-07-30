import Icon from "./Icon";

// A row in a reorderable source-file list
function ReorderRow({ children, isFirst, isLast, onMoveUp, onMoveDown, onRemove }) {
  const arrowCls =
    "w-6 h-5 flex items-center justify-center rounded border border-neutral-200 text-neutral-500 hover:bg-neutral-900 hover:border-neutral-900 hover:text-white transition-colors disabled:opacity-25 disabled:hover:bg-white disabled:hover:text-neutral-500 disabled:hover:border-neutral-200";

  return (
    <div className="group flex items-center gap-2.5 p-2 rounded-lg border border-neutral-300 bg-white hover:border-neutral-400 transition-colors">
      <div className="flex flex-col gap-1 shrink-0">
        <button onClick={onMoveUp} disabled={isFirst} aria-label="Move up" className={arrowCls}>
          <Icon name="chevronLeft" className="w-3 h-3 rotate-90" />
        </button>
        <button onClick={onMoveDown} disabled={isLast} aria-label="Move down" className={arrowCls}>
          <Icon name="chevronRight" className="w-3 h-3 rotate-90" />
        </button>
      </div>

      {children}

      <button
        onClick={onRemove}
        aria-label="Remove"
        title="Remove"
        className="shrink-0 p-1.5 rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <Icon name="trash" className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default ReorderRow;
