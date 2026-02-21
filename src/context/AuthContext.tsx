"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, googleProvider, db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const loadProfile = async (u: User): Promise<UserProfile | null> => {
    try {
      if (!db) return null;
      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      // Create initial profile (not onboarded yet)
      const newProfile: UserProfile = {
        uid: u.uid,
        username: "",
        displayName: u.displayName || "User",
        photoURL: u.photoURL || "",
        bio: "",
        homeCity: "",
        isPublic: true,
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        onboarded: false,
      };
      await setDoc(ref, newProfile);
      return newProfile;
    } catch (err) {
      console.error("Failed to load profile:", err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    const p = await loadProfile(user);
    if (p) setProfile(p);
  };

  useEffect(() => {
    if (!auth) { setLoading(false); return; }

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const p = await loadProfile(u);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    const timeout = setTimeout(() => setLoading(false), 5000);
    return () => { unsub(); clearTimeout(timeout); };
  }, []);

  // Redirect to setup if not onboarded
  useEffect(() => {
    if (loading) return;
    if (user && profile && !profile.onboarded && pathname !== "/setup") {
      router.push("/setup");
    }
  }, [user, profile, loading, pathname, router]);

  const signInWithGoogle = async () => {
    if (!auth) return;
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) await loadProfile(result.user);
    } catch (err) {
      console.error("Sign-in failed:", err);
    }
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    setProfile(null);
    router.push("/");
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user || !db) return;
    try {
      const ref = doc(db, "users", user.uid);
      const updated = { ...profile, ...data, updatedAt: Date.now() };
      await setDoc(ref, updated, { merge: true });
      setProfile(updated as UserProfile);
    } catch (err) {
      console.error("Failed to update profile:", err);
      throw err;
    }
  };

  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    if (!db) return false;
    const q = query(collection(db, "users"), where("username", "==", username.toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) return true;
    // If the only result is current user, it's available
    return snap.docs.length === 1 && snap.docs[0].id === user?.uid;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, logout, updateProfile, checkUsernameAvailable, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
