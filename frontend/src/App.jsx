import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import MainLayout from "./layout/MainLayout.jsx";
import Learn from "./pages/Learn.jsx";
import Log from "./pages/Log.jsx";
import Message from "./pages/Message.jsx";

export default function App() {
  return (
    <Routes>

      <Route path="/" element={<Login />} />


      <Route path="/app" element={<MainLayout />}>
        <Route index element={<Navigate to="learn" replace />} />
        <Route path="learn" element={<Learn />} />
        <Route path="log" element={<Log />} />
        <Route path="message" element={<Message />} />
      </Route>


      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
