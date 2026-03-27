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
    if (!isValidEmail(e)) return alert("Please enter a valid email.");
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

      localStorage.setItem("userType", data.userType);

      if (isProvider) {
        localStorage.setItem("currentProviderEmail", data.email);

        if (data.is_first_login) {
          navigate("/provider/change-password");
        } else {
          navigate("/provider/dashboard");
        }
      } else {
        localStorage.setItem("currentUserEmail", data.email);

        if (data.provider_email) {
          localStorage.setItem("myProviderEmail", data.provider_email);
        }

        localStorage.setItem("myProviderName", data.provider_name || "My Provider");
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

        <p className="loginSubtitle">
          {isProvider
            ? "Welcome back, healthcare provider"
            : "Healthy eating support made simple"}
        </p>
      </div>

      <div className="loginCard">
        <div className="loginRoleSwitch" aria-label="Choose account type">
          <button
            type="button"
            className={`rolePill ${!isProvider ? "active" : ""}`}
            onClick={() => setIsProvider(false)}
          >
            I’m a Patient
          </button>
          <button
            type="button"
            className={`rolePill ${isProvider ? "active" : ""}`}
            onClick={() => setIsProvider(true)}
          >
            Healthcare Provider Login
          </button>
        </div>

        <h1 className="loginTitle">
          {isProvider ? "Provider Portal" : "Patient Login"}
        </h1>

        <p className="loginHelperText">
          {isProvider
            ? "Sign in to view your dashboard, patients, and messages."
            : "Sign in to track meals, chat with Chompy, and stay on goal."}
        </p>

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
            placeholder={isProvider ? "you@clinic.com" : "you@example.com"}
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

          <button type="submit" className="loginButton">
            {isProvider ? "Enter Provider Portal" : "Log In"}
          </button>

          {!isProvider && (
            <button
              type="button"
              className="loginButton loginButtonSecondary"
              onClick={() => navigate("/setup-profile")}
            >
              Create Patient Account
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