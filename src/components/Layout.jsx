import { Outlet } from "react-router-dom";
import Header from "./Header";

function Layout({ shared }) {
  return (
    <div className="h-screen flex flex-col bg-neutral-100 font-sans antialiased">
      <Header printers={shared.printers} />
      <div className="flex-1 flex overflow-hidden">
        <Outlet context={shared} />
      </div>
    </div>
  );
}

export default Layout;
