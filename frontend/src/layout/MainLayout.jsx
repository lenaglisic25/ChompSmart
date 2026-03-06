import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import "./MainLayout.css";
import logo from "../assets/Chomp Smart Logo Transparent.png";
import GroceryDrawer from "../grocery/GroceryDrawer";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isLearn = location.pathname.startsWith("/app/learn");
  const isLog = location.pathname.startsWith("/app/log");
  const isMessage = location.pathname.startsWith("/app/message");
  const isResources = location.pathname.startsWith("/app/resources");

  const [gOpen, setGOpen] = useState(false);

  return (
    <div className="shell">
      <header className="topBar">
        <div className="topLeftActions">
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

          <button
              className="accountBtn"
              type="button"
              onClick={() => setGOpen(true)}
              aria-label="Open grocery list"
              title="Grocery list"
          >
         <span className="accountIcon" aria-hidden="true">
  <svg viewBox="0 0 24 24">
    <path
        d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 .001 4A2 2 0 0 0 17 18ZM7.2 14h9.45a2 2 0 0 0 1.93-1.5l1.72-6.5H6.1L5.4 3H2v2h2l3.6 7.59-1.35 2.44A2 2 0 0 0 8 18h12v-2H8.42a.25.25 0 0 1-.22-.37L9 14Z"
        fill="currentColor"
    />
  </svg>
</span>
            <span className="accountLabel">grocery</span>
          </button>

          <NavLink
              to="/app/resources"
              className={isResources ? "accountBtn topIconLink activeTopLink" : "accountBtn topIconLink"}
          >
            <span className="accountIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                    d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a3 3 0 0 1 3 3v13H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"
                  fill="currentColor"
                />
                <path
                  d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13a3 3 0 0 0-3 3v13h7.5a2.5 2.5 0 0 1 2.5 2.5v-16Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="accountLabel">resources</span>
          </NavLink>
        </div>

        <div className="topLogoWrap">
          <img className="topLogoImg" src={logo} alt="ChompSmart" />
        </div>

        <div className="topRightActions">
          <button
            className="logoutBtn"
            type="button"
            onClick={() => navigate("/")}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

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

      <GroceryDrawer open={gOpen} onClose={() => setGOpen(false)} />
    </div>
  );
}