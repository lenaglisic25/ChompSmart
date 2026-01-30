import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import logo from "../assets/chompsmart-logo.png";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:8000/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) throw new Error("Failed to create user");

      const user = await res.json();
      console.log("User created:", user);

      localStorage.setItem("currentUserEmail", user.email);

      navigate("/app/learn");
    } catch (err) {
      console.error(err);
      alert("Error creating account");
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

        <form className="loginForm" onSubmit={onSubmit}>
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

          <button className="loginButton" type="submit">
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}
