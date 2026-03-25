import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import logo from "../assets/Chomp Smart Logo Transparent.png";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isProvider, setIsProvider] = useState(false);

  const isValidEmail = (s) => /\S+@\S+\.\S+/.test(s);

  const login = async () => {
    const e = email.trim();
    const p = password;

    if (!e) return alert("Please enter an email.");
    if (!isValidEmail(e)) return alert("Please enter a valid email (must include @).");
    if (!p) return alert("Please enter a password.");

    const endpoint = isProvider 
      ? "http://localhost:8000/providers/login" 
      : "http://localhost:8000/users/login";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: p }),
      });

      const raw = await res.text();

      if (!res.ok) {
        try {
          const errorData = JSON.parse(raw);
          throw new Error(errorData.detail || raw || `HTTP ${res.status}`);
        } catch {
          throw new Error(raw || `HTTP ${res.status}`);
        }
      }

      const data = JSON.parse(raw);
      
      if (isProvider) {
        localStorage.setItem("currentProviderEmail", data.email);
        
        if (data.is_first_login) {
          navigate("/provider/change-password");
        } else {
          navigate("/provider/dashboard");
        }
      } else {
        localStorage.setItem("currentUserEmail", data.email);
        navigate("/app");
      }
    } catch (err) {
      console.error(err);
      alert(`Error logging in: ${err.message}`);
    }
  };

  return (
    <div className="loginPage">
      <div className="loginTop">
        <div className="loginLogoFrame" aria-label="ChompSmart logo">
          <img className="loginLogoImg" src={logo} alt="ChompSmart logo" />
        </div>

        <div className="brandWordmark" aria-label="ChompSmart">
          <span className="chomp">Chomp</span>
          <span className="smart">Smart</span>
        </div>
      </div>

      <div className="loginCard">
        <h1 className="loginTitle">{isProvider ? "Provider Login" : "Login"}</h1>

        <form
          className="loginForm"
          onSubmit={(e) => {
            e.preventDefault();
            login();
          }}
        >
          <label className="loginLabel" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="loginInput"
            type="email"
            placeholder="you@clinic.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />

          <label className="loginLabel" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="loginInput"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <div style={{ display: "flex", gap: "10px", marginTop: "10px", marginBottom: "15px" }}>
            <label style={{ fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "5px" }}>
              <input 
                type="checkbox" 
                checked={isProvider} 
                onChange={() => setIsProvider(!isProvider)} 
              />
              I am a Healthcare Provider
            </label>
          </div>

          <button type="submit" className="loginButton">
            Log In
          </button>

          {!isProvider && (
            <button
              type="button"
              className="loginButton"
              onClick={() => navigate("/setup-profile")}
              style={{ marginTop: 10 }}
            >
              Create Account
            </button>
          )}
        </form>
      </div>

      <p className="copyright">
        ©Copyright 2026 University of Florida Research Foundation, Inc. All Rights Reserved.
      </p>
    </div>
  );
}