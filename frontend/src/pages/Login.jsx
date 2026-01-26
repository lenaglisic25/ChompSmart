import { useState } from "react";
import "./Login.css";
import logo from "../assets/chompsmart-logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setError("");
    alert("Login submitted (frontend only for now)");
  };

  return (
    <div className="appShell">
      {/* Top blue header like your mockups */}
      <header className="topBar">
        <img className="topLogo" src={logo} alt="ChompSmart logo" />
      </header>

      {/* Main content */}
      <main className="content">
        <div className="loginCard">
          <h1 className="loginTitle">Provider Portal Login</h1>
          <p className="loginSubtitle">Sign in to continue</p>

          <form className="loginForm" onSubmit={handleSubmit}>
            <label className="loginLabel">Email</label>
            <input
              className="loginInput"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label className="loginLabel">Password</label>
            <input
              className="loginInput"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button className="loginButton" type="submit">
              Login
            </button>

            {error && <div className="loginError">{error}</div>}
          </form>

          <p className="loginInfo">
            Accounts are created by your healthcare provider/office. Please
            contact your physician if you need access.
          </p>
        </div>
      </main>

      {/* Bottom nav bar) */}
      <footer className="bottomBar">
        <div className="navItem">
          <div className="navIcon">🏠</div>
          <div className="navText">learn</div>
        </div>
        <div className="navItem">
          <div className="navIcon">🍽️</div>
          <div className="navText">log</div>
        </div>
        <div className="navItem">
          <div className="navIcon">💬</div>
          <div className="navText">message</div>
        </div>
      </footer>
    </div>
  );
}
