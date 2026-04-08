import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../components/api";
import "../pages/Login.css";
import logo from "../assets/Chomp Smart Logo Transparent.png";

export default function ChangePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const storedEmail = localStorage.getItem("currentProviderEmail");
    if (!storedEmail) {
      navigate("/login");
    } else {
      setEmail(storedEmail);
    }
  }, [navigate]);

  const handleChangePassword = async () => {
    if (!password || !confirmPassword) return alert("Please fill out both fields.");
    if (password !== confirmPassword) return alert("Passwords do not match.");
    if (password.length < 8) return alert("Password must be at least 8 characters long.");

    try {
      const res = await apiFetch("/providers/change-password", {
        method: "POST",
        body: JSON.stringify({ new_password: password }),
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

      navigate("/provider/dashboard");
    } catch (err) {
      console.error(err);
      alert(`Error updating password: ${err.message}`);
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
        <h1 className="loginTitle">Set New Password</h1>

        <form
          className="loginForm"
          onSubmit={(e) => {
            e.preventDefault();
            handleChangePassword();
          }}
        >
          <label className="loginLabel" htmlFor="password">
            New Password
          </label>
          <input
            id="password"
            className="loginInput"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <label className="loginLabel" htmlFor="confirmPassword">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            className="loginInput"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button type="submit" className="loginButton" style={{ marginTop: 15 }}>
            Update and Log In
          </button>
        </form>
      </div>
    </div>
  );
}