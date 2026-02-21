"use client";

import { useState, useEffect } from "react";
import { doc, setDoc, deleteDoc, getDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function FollowButton({ targetUid }: { targetUid: string }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db || user.uid === targetUid) { setLoading(false); return; }
    const check = async () => {
      const ref = doc(db, "following", user.uid, "userFollowing", targetUid);
      const snap = await getDoc(ref);
      setFollowing(snap.exists());
      setLoading(false);
    };
    check();
  }, [user, targetUid]);

  const toggle = async () => {
    if (!user || !db) return;
    setLoading(true);
    try {
      const followingRef = doc(db, "following", user.uid, "userFollowing", targetUid);
      const followerRef = doc(db, "followers", targetUid, "userFollowers", user.uid);
      const myRef = doc(db, "users", user.uid);
      const theirRef = doc(db, "users", targetUid);

      if (following) {
        await deleteDoc(followingRef);
        await deleteDoc(followerRef);
        await setDoc(myRef, { followingCount: increment(-1) }, { merge: true });
        await setDoc(theirRef, { followerCount: increment(-1) }, { merge: true });
        setFollowing(false);
      } else {
        await setDoc(followingRef, { uid: targetUid, createdAt: Date.now() });
        await setDoc(followerRef, { uid: user.uid, createdAt: Date.now() });
        await setDoc(myRef, { followingCount: increment(1) }, { merge: true });
        await setDoc(theirRef, { followerCount: increment(1) }, { merge: true });
        setFollowing(true);
      }
    } catch (err) {
      console.error("Follow toggle failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.uid === targetUid) return null;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-5 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
        following
          ? "bg-white/[0.06] text-zinc-300 hover:bg-rose-500/15 hover:text-rose-400 border border-white/[0.06]"
          : "btn-primary"
      }`}
    >
      {loading ? "..." : following ? "Following" : "Follow"}
    </button>
  );
}
