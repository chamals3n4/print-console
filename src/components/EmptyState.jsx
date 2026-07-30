import Icon from "./Icon";

function EmptyState({ icon = "document", message }) {
  return (
    <div className="py-10 flex flex-col items-center gap-2 text-center">
      <Icon name={icon} className="w-6 h-6 text-neutral-200" strokeWidth={1.5} />
      <p className="text-xs text-neutral-400">{message}</p>
    </div>
  );
}

export default EmptyState;
