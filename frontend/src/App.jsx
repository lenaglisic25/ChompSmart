import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import MainLayout from "./layout/MainLayout.jsx";
import Learn from "./pages/Learn.jsx";
import Log from "./pages/Log.jsx";
import Message from "./pages/Message.jsx";
import Profile from "./pages/Profile.jsx";

export default function App() {
  return (
    <Routes>
      {/* Login screen */}
      <Route path="/" element={<Login />} />

      {/* Profile setup route (NO tabs / NO MainLayout) */}
      <Route path="/setup-profile" element={<Profile />} />

      {/* Main app shell (HAS tabs) */}
      <Route path="/app" element={<MainLayout />}>
        <Route index element={<Navigate to="learn" replace />} />
        <Route path="learn" element={<Learn />} />
        <Route path="log" element={<Log />} />
        <Route path="message" element={<Message />} />

        {/* Profile inside app shell (HAS tabs) */}
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
