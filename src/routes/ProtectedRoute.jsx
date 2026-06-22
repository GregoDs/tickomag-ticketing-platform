import { Navigate, useLocation } from "react-router-dom";
import Spinner from "../components/ui/Spinner";
import useAuth from "../hooks/useAuth";

function ProtectedRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <main className="admin-route-loading"><Spinner /></main>;
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default ProtectedRoute;
