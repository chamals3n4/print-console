import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "Print" },
  { to: "/image-to-pdf", label: "Image → PDF" },
  { to: "/merge", label: "Merge" },
  { to: "/pages", label: "Pages" },
];

function NavTabs() {
  return (
    <nav className="flex items-center gap-0.5">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === "/"}
          className={({ isActive }) =>
            `px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              isActive
                ? "bg-neutral-100 text-neutral-700"
                : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default NavTabs;
