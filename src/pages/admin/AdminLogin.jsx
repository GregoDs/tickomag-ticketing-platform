import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import useAuth from "../../hooks/useAuth";
import "./AdminLogin.css";

function AdminLogin() {
  const { login, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAdmin) navigate(location.state?.from || "/admin", { replace: true });
  }, [isAdmin, location.state, navigate]);

  const submit = async (event) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your admin email and password.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await login(email, password);
      navigate(location.state?.from || "/admin", { replace: true });
    } catch (loginError) {
      console.error("Administrator login failed:", loginError);
      setError(loginError.message.includes("administrator access")
        ? loginError.message
        : "Incorrect credentials or administrator access is not configured.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-login-page">
      <Link className="admin-login-wordmark" to="/">ticko<span>mag</span><i>.</i></Link>
      <section className="admin-login-copy">
        <p>Restricted access</p>
        <h1>Gate control,<br /><em>without the wait.</em></h1>
        <span>Review M-Pesa requests, approve entry and issue scannable tickets in real time.</span>
      </section>
      <form className="admin-login-card" onSubmit={submit} noValidate>
        <span>Admin / 01</span>
        <h2>Sign in</h2>
        <label>Email address<input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} autoComplete="username" placeholder="admin@tickomag.com" /></label>
        <label>Password<input type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} autoComplete="current-password" placeholder="••••••••" /></label>
        {error && <small role="alert">{error}</small>}
        <Button variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : "Enter dashboard"}<b>→</b></Button>
      </form>
    </main>
  );
}

export default AdminLogin;
