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
    alert("Login submitted (frontend only)");
  };

  return (
    <div className="loginPage">

      <div className="logoContainer">
        <img
          src="/chompsmart-logo.png"
          alt="ChompSmart Logo"
          className="logo"
        />
      </div>


      <div className="loginCard">
        <h1 className="loginTitle">Login</h1>


        <form className="loginForm" onSubmit={handleSubmit}>
          <label>Email</label>
          <input
              type="email"
              placeholder="you@clinic.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
          />

          <label>Password</label>
          <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit">Log In</button>

          {error && <div className="error">{error}</div>}
        </form>

        <p className="loginNote">
          Accounts are created by your healthcare provider.
          Please contact your physician for access.
        </p>
      </div>
    </div>
  );
}
