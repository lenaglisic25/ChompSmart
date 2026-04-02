import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import "./Login.css";
import logo from "../assets/Chomp Smart Logo Transparent.png";

<<<<<<< Updated upstream
=======
const GOOGLE_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

>>>>>>> Stashed changes
export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isProvider, setIsProvider] = useState(false);

  const isValidEmail = (s) => /\S+@\S+\.\S+/.test(s);

  const processAuthResponse = (data) => {
    localStorage.setItem("userType", data.userType || (isProvider ? "provider" : "patient"));

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
      
      // Drops brand new Google users directly into Setup Profile
      if (data.is_first_login) {
        navigate("/setup-profile");
      } else {
        navigate("/app");
      }
    }
  };

  const handleAuth = async () => {
    const e = email.trim();
    const p = password;

<<<<<<< Updated upstream
    if (!e) return alert("Please enter an email.");
    if (!isValidEmail(e)) return alert("Please enter a valid email (must include @).");
    if (!p) return alert("Please enter a password.");

    const endpoint = isProvider 
      ? "http://localhost:8000/providers/login" 
      : "http://localhost:8000/users/login";
=======
    if (!e || !isValidEmail(e) || !p) {
      return alert("Please enter a valid email and password.");
    }

    const endpoint = isProvider 
      ? `${API_BASE}/providers/login` 
      : `${API_BASE}/users/login`;
>>>>>>> Stashed changes

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: p }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Authentication failed.");
      }

<<<<<<< Updated upstream
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
=======
      processAuthResponse(data);
>>>>>>> Stashed changes
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const onGoogleSuccess = async (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    
    try {
      const res = await fetch(`${API_BASE}/users/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token: credentialResponse.credential,
          email: decoded.email,
          name: decoded.name 
        }),
      });

      if (!res.ok) throw new Error("Google authentication failed.");
      
      const data = await res.json();
      processAuthResponse(data);
    } catch (err) {
      console.error(err);
      alert("Google Login Error: " + err.message);
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_ID}>
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

<<<<<<< Updated upstream
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
=======
        <div className="loginCard">
          <div className="loginRoleSwitch" aria-label="Choose account type">
            <button
              type="button"
              className={`rolePill ${!isProvider ? "active" : ""}`}
              onClick={() => setIsProvider(false)}
            >
              Patient
>>>>>>> Stashed changes
            </button>
            <button
              type="button"
              className={`rolePill ${isProvider ? "active" : ""}`}
              onClick={() => setIsProvider(true)}
            >
              Healthcare Provider
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
              handleAuth();
            }}
          >
            <label className="loginLabel" htmlFor="email">Email</label>
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

            <label className="loginLabel" htmlFor="password">Password</label>
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
              <div className="googleLoginWrapper" style={{ marginTop: "15px", display: "flex", justifyContent: "center" }}>
                <GoogleLogin
                  onSuccess={onGoogleSuccess}
                  onError={() => alert("Google Login Failed")}
                  theme="filled_blue"
                  shape="pill"
                />
              </div>
            )}

            {!isProvider && (
              <button
                type="button"
                className="loginButton loginButtonSecondary"
                style={{ marginTop: "10px" }}
                onClick={() => {
                  // Wipe any old sessions to trigger manual setup mode in Profile.jsx
                  localStorage.removeItem("currentUserEmail");
                  navigate("/setup-profile");
                }}
              >
                Sign Up
              </button>
            )}
          </form>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}