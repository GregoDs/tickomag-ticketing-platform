import { useCallback, useEffect, useMemo, useState } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import { getAdminProfile, signInAdmin, signOutAdmin } from "../services/auth.service";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => onIdTokenChanged(auth, async (currentUser) => {
    if (!currentUser) {
      setUser(null);
      setAdminProfile(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const adminProfile = await getAdminProfile(currentUser);
      if (!adminProfile) {
        await signOutAdmin();
        setUser(null);
        setAdminProfile(null);
        setIsAdmin(false);
        return;
      }

      setUser(currentUser);
      setAdminProfile(adminProfile);
      setIsAdmin(true);
    } catch (error) {
      console.error("Unable to verify administrator session:", error);
      setUser(null);
      setAdminProfile(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }), []);

  const login = useCallback(async (email, password) => {
    const { user: adminUser, profile } = await signInAdmin(email, password);
    setUser(adminUser);
    setAdminProfile(profile);
    setIsAdmin(true);
    return adminUser;
  }, []);

  const value = useMemo(() => ({
    user,
    adminProfile,
    isAdmin,
    loading,
    login,
    logout: signOutAdmin,
  }), [user, adminProfile, isAdmin, loading, login]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
