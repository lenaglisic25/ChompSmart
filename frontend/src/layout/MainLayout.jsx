import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import "./MainLayout.css";
import logo from "../assets/chompsmart-logo.png";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isLearn = location.pathname.startsWith("/app/learn");
  const isLog = location.pathname.startsWith("/app/log");
  const isMessage = location.pathname.startsWith("/app/message");

  return (
    <div className="shell">
      {/* TOP BAR */}
      <header className="topBar">
        {/* LEFT: Account */}
        <button
          className="accountBtn"
          type="button"
          onClick={() => navigate("/app/profile")}
        >
          <span className="accountIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2c-4.8 0-8 2.4-8 5v1h16v-1c0-2.6-3.2-5-8-5Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="accountLabel">account</span>
        </button>

        {
        <div className="topLogoWrap">
          <img className="topLogoImg" src={logo} alt="ChompSmart" />
        </div>

        {/* RIGHT: Logout */}
        <button
          className="logoutBtn"
          type="button"
          onClick={() => navigate("/")}
        >
          Logout
        </button>
      </header>

      {/* CONTENT */}
      <main className="content">
        <Outlet />
      </main>

      {/* BOTTOM TABS */}
      <nav className="bottomTabs">
        <NavLink to="/app/learn" className={isLearn ? "tab active" : "tab"}>
          <span className="tabLabel">learn</span>
        </NavLink>

        <NavLink to="/app/log" className={isLog ? "tab active" : "tab"}>
          <span className="tabLabel">log</span>
        </NavLink>

        <NavLink to="/app/message" className={isMessage ? "tab active" : "tab"}>
          <span className="tabLabel">message</span>
        </NavLink>
      </nav>
    </div>
  );
}
