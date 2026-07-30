import { cardCls, cardTitleCls } from "../lib/ui";

function ToolPanel({ title, description, children }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-5">
        <div className={`${cardCls} space-y-1`}>
          <span className={cardTitleCls}>{title}</span>
          {description && (
            <p className="text-xs text-neutral-500">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export default ToolPanel;
