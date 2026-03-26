import { Navigate } from "react-router-dom";

export default function PageAccess({ children, requiredType }) {
  const userType = localStorage.getItem("userType");

  if (userType !== requiredType) {
    return <Navigate to={userType === "provider" ? "/provider/dashboard" : "/app"} replace />;
  }

  return children;
}