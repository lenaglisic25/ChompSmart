import { useState } from "react";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();

    console.log("Login:", { email, password });
  };

  return (
    <div className="loginPage">

      <div className="brandRow">

        <img
          className="gatorLogo"
          src="/chompsmart-logo.png"
          alt="ChompSmart Gator"
        />

        <div className="brandWordmark" aria-label="ChompSmart">
          <span className="chomp">Chomp</span>
          <span className="smart">Smart</span>
        </div>
      </div>


      <div className="loginCard biteCorner">
        <h1 className="loginTitle">Login</h1>

        <form className="loginForm" onSubmit={onSubmit}>
          <label className="fieldLabel" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="textInput"
            type="email"
            placeholder="you@clinic.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />

          <label className="fieldLabel" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="textInput"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <button className="loginButton" type="submit">
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}
