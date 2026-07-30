import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "Print" },
  { to: "/image-to-pdf", label: "Image to PDF" },
  { to: "/merge", label: "Merge PDF" },
  { to: "/pages", label: "Edit Pages" },
];

function NavTabs() {
  return (
    <nav className="flex items-center gap-1 p-1 rounded-md bg-neutral-900">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === "/"}
          className={({ isActive }) =>
            `px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              isActive
                ? "bg-white text-neutral-900"
                : "text-neutral-300 hover:text-white hover:bg-neutral-700"
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
