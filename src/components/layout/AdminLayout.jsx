import { NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import "./AdminLayout.css";

function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <NavLink className="admin-wordmark" to="/admin">ticko<span>mag</span><i>.</i></NavLink>
        <nav aria-label="Admin navigation">
          <NavLink end to="/admin"><span>01</span>Requests</NavLink>
          <NavLink to="/"><span>02</span>View website</NavLink>
        </nav>
        <div className="admin-profile">
          <span>Signed in as</span>
          <strong>{user?.email}</strong>
          <button type="button" onClick={signOut}>Sign out →</button>
        </div>
      </aside>
      <section className="admin-content"><Outlet /></section>
    </div>
  );
}

export default AdminLayout;
