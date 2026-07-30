import Icon from "./Icon";
import NavTabs from "./NavTabs";

function Header({ printers }) {
  return (
    <header className="flex items-center justify-between px-5 py-2 border-b border-neutral-200 bg-white shrink-0">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2.5">
          <Icon
            name="printer"
            className="w-4 h-4 text-neutral-400"
            strokeWidth={1.5}
          />
          <span className="text-xs font-semibold text-neutral-700">
            Print Console
          </span>
        </div>
        <NavTabs />
      </div>
      <div className="flex items-center gap-2 text-[11px] text-neutral-400">
        <span
          className={`w-1.5 h-1.5 rounded-full ${printers.length > 0 ? "bg-emerald-500" : "bg-red-400"}`}
        />
        {printers.length > 0
          ? `${printers.length} printer${printers.length > 1 ? "s" : ""} online`
          : "No printers"}
      </div>
    </header>
  );
}

export default Header;
