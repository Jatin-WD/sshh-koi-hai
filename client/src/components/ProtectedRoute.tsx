import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-charcoal/60">Checking your private space...</div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
