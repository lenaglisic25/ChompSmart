import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import MainLayout from "./layout/MainLayout.jsx";
import Learn from "./pages/Learn.jsx";
import Log from "./pages/Log.jsx";
import Message from "./pages/Message.jsx";
import Profile from "./pages/Profile.jsx";
import Resources from "./pages/Resources.jsx";

import ProviderLayout from "./provider/ProviderLayout.jsx";
import ProviderDashboard from "./provider/ProviderDashboard.jsx";
import ProviderUsers from "./provider/ProviderUsers.jsx";
import ProviderMessages from "./provider/ProviderMessages.jsx";
import ChangePassword from "./provider/ChangePassword.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/setup-profile" element={<Profile />} />
      
      {/* Moved ChangePassword outside so it doesn't load the dashboard layout */}
      <Route path="/provider/change-password" element={<ChangePassword />} />

      <Route path="/app" element={<MainLayout />}>
        <Route index element={<Navigate to="log" replace />} />
        <Route path="learn" element={<Learn />} />
        <Route path="log" element={<Log />} />
        <Route path="message" element={<Message />} />
        <Route path="resources" element={<Resources />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="/provider" element={<ProviderLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ProviderDashboard />} />
        <Route path="users" element={<ProviderUsers />} />
        <Route path="messages" element={<ProviderMessages />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}