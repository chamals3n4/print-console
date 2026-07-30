import { panelCls, panelTitleCls, panelDescCls } from "../lib/ui";

// Card used across the tool pages, with an optional header action
function Panel({ title, description, action, children, bodyClassName = "" }) {
  return (
    <section className={panelCls}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 px-4 pt-4">
          <div className="min-w-0">
            {title && <h2 className={panelTitleCls}>{title}</h2>}
            {description && (
              <p className={`${panelDescCls} mt-0.5`}>{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={`p-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export default Panel;
