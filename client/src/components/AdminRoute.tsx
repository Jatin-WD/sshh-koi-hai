import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-charcoal/60">Checking administrator access...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === "ADMIN" ? <Outlet /> : <Navigate to="/account" replace />;
}
