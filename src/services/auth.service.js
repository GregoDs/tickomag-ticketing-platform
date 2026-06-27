import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export async function getAdminProfile(user) {
  if (!user) return null;
  const adminDocument = await getDoc(doc(db, "admins", user.uid));
  if (!adminDocument.exists()) return null;

  const profile = adminDocument.data();
  if (profile.role !== "admin" || profile.active === false) return null;
  return { id: adminDocument.id, ...profile };
}

export async function signInAdmin(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const adminProfile = await getAdminProfile(credential.user);

  if (!adminProfile) {
    await signOut(auth);
    throw new Error("This account does not have administrator access.");
  }

  return {
    user: credential.user,
    profile: adminProfile,
  };
}

export function signOutAdmin() {
  return signOut(auth);
}
