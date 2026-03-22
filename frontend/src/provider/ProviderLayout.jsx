import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import "./ProviderLayout.css";
import logo from "../assets/Chomp Smart Logo Transparent.png";

export default function ProviderLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [patientSearch, setPatientSearch] = useState("");

  const isDashboard = location.pathname.startsWith("/provider/dashboard");
  const isUsers = location.pathname.startsWith("/provider/users");
  const isMessages = location.pathname.startsWith("/provider/messages");

  function getPageTitle() {
    if (isUsers) return "Provider Users";
    if (isMessages) return "Provider Messages";
    return "Provider Dashboard";
  }

  function getPageSubtitle() {
    if (isUsers) {
      return "Search and review patient profiles and follow-up needs";
    }
    if (isMessages) {
      return "Review and respond to patient conversations";
    }
    return "One-screen patient summary for nutrition follow-up";
  }

  return (
    <div className="providerShell">
      <aside className="providerSidebar">
        <div className="providerBrandBlock">
          <img className="providerLogo" src={logo} alt="ChompSmart" />
          <div className="providerBrandText">
            <div className="providerBrandTitle">ChompSmart</div>
            <div className="providerBrandSub">Provider Portal</div>
          </div>
        </div>

        <div className="providerSearchWrap">
          <input
            className="providerSearchInput"
            type="text"
            placeholder="Search patient..."
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
          />
        </div>

        <nav className="providerNav">
          <NavLink
            to="/provider/dashboard"
            className={isDashboard ? "providerNavLink active" : "providerNavLink"}
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/provider/users"
            className={isUsers ? "providerNavLink active" : "providerNavLink"}
          >
            Users
          </NavLink>

          <NavLink
            to="/provider/messages"
            className={isMessages ? "providerNavLink active" : "providerNavLink"}
          >
            Messages
          </NavLink>
        </nav>

        <div className="providerSidebarFooter">
          <button
            type="button"
            className="providerLogoutBtn"
            onClick={() => navigate("/")}
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="providerMainWrap">
        <header className="providerTopBar">
          <div>
            <div className="providerTopBarTitle">{getPageTitle()}</div>
            <div className="providerTopBarSub">{getPageSubtitle()}</div>
          </div>

          <div className="providerTopBarActions">
            <button
              type="button"
              className="providerTopAction ghost"
              onClick={() => navigate("/app")}
            >
              Patient App
            </button>
          </div>
        </header>

        <main className="providerMain">
          <Outlet />
        </main>
      </div>
    </div>
  );
}