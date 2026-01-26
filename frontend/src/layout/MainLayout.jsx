import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./MainLayout.css";

export default function MainLayout() {
  const navigate = useNavigate();

  return (
    <div className="appShell">

      <header className="topBar">
        <button className="profileBtn" onClick={() => alert("Profile clicked")}>
          Profile
        </button>

        <div className="topTitle">ChompSmart</div>

        <button className="logoutBtn" onClick={() => navigate("/")}>
          Logout
        </button>
      </header>


      <main className="appContent">
        <Outlet />
      </main>


      <nav className="bottomTabs">
        <NavLink to="/app/learn" className={({ isActive }) => (isActive ? "tab active" : "tab")}>
          Learn
        </NavLink>
        <NavLink to="/app/log" className={({ isActive }) => (isActive ? "tab active" : "tab")}>
          Log
        </NavLink>
        <NavLink to="/app/message" className={({ isActive }) => (isActive ? "tab active" : "tab")}>
          Message
        </NavLink>
      </nav>
    </div>
  );
}
