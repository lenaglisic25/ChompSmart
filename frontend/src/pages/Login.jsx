import { useState } from "react";
import "./Login.css";

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
    <div className="loginScreen">
      <div className="loginCard">
        <h1 className="loginTitle">ChompSmart</h1>
        <p className="loginSubtitle">Log in to continue</p>

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


      </div>
    </div>
  );
}
