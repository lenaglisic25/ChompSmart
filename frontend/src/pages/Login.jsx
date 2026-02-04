import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import logo from "../assets/Chomp Smart Logo Transparent.png";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isValidEmail = (s) => /\S+@\S+\.\S+/.test(s);

  const login = async () => {
    const e = email.trim();
    const p = password;

    if (!e) return alert("Please enter an email.");
    if (!isValidEmail(e)) return alert("Please enter a valid email (must include @).");
    if (!p) return alert("Please enter a password.");

    try {
      const res = await fetch("http://localhost:8000/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: p }),
      });

      const raw = await res.text();
      if (!res.ok) throw new Error(raw || `HTTP ${res.status}`);

      const data = JSON.parse(raw);


      localStorage.setItem("currentUserEmail", data.email);

      navigate("/app/learn");
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
        <h1 className="loginTitle">Login</h1>

        <form className="loginForm" onSubmit={(e) => e.preventDefault()}>
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

          <button
            type="button"
            className="loginButton"
            onClick={() => login()}
          >
            Log In
          </button>
          <button
            type="button"
            className="loginButton"
            onClick={() => navigate("/setup-profile")}
            style={{ marginTop: 10 }}
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
}
