"use client";

import { useState, useEffect, Suspense } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import FollowButton from "@/components/FollowButton";
import { FiArrowLeft, FiUsers } from "react-icons/fi";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

function FollowersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = searchParams.get("uid");
  const tabParam = searchParams.get("tab") || "followers";
  const [tab, setTab] = useState<"followers" | "following">(tabParam === "following" ? "following" : "followers");
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !db) { setLoading(false); return; }

    const load = async () => {
      try {
        // Get the user's profile
        const profileSnap = await getDoc(doc(db, "users", uid));
        if (profileSnap.exists()) setProfile(profileSnap.data() as UserProfile);

        // Get followers
        const followersSnap = await getDocs(collection(db, "followers", uid, "userFollowers"));
        const followerProfiles: UserProfile[] = [];
        for (const d of followersSnap.docs) {
          const uSnap = await getDoc(doc(db, "users", d.id));
          if (uSnap.exists()) followerProfiles.push(uSnap.data() as UserProfile);
        }
        setFollowers(followerProfiles);

        // Get following
        const followingSnap = await getDocs(collection(db, "following", uid, "userFollowing"));
        const followingProfiles: UserProfile[] = [];
        for (const d of followingSnap.docs) {
          const uSnap = await getDoc(doc(db, "users", d.id));
          if (uSnap.exists()) followingProfiles.push(uSnap.data() as UserProfile);
        }
        setFollowing(followingProfiles);
      } catch (err) {
        console.error("Failed to load followers:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [uid]);

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  const currentList = tab === "followers" ? followers : following;

  return (
    <div className="max-w-lg mx-auto px-4 pt-24 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={handleBack} className="p-2 hover:bg-white/[0.06] rounded-xl transition-colors">
          <FiArrowLeft size={20} className="text-zinc-400" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-zinc-100">{profile?.displayName || "User"}</h1>
          <p className="text-xs text-zinc-500">@{profile?.username}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-1 mb-6 border border-white/[0.04]">
        <button onClick={() => setTab("followers")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === "followers" ? "bg-indigo-500/15 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}>
          Followers ({followers.length})
        </button>
        <button onClick={() => setTab("following")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === "following" ? "bg-indigo-500/15 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}>
          Following ({following.length})
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 shimmer rounded-xl" />)}
        </div>
      ) : currentList.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <FiUsers size={32} className="mx-auto mb-3 text-zinc-600" />
          <p>{tab === "followers" ? "No followers yet" : "Not following anyone yet"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {currentList.map((u) => (
            <div key={u.uid} className="flex items-center gap-3 p-3.5 bg-white/[0.03] rounded-xl border border-white/[0.04] hover:bg-white/[0.06] transition-all">
              <Link href={`/user?u=${u.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                <img src={u.photoURL || "/default-avatar.png"} alt="" className="w-11 h-11 rounded-xl ring-2 ring-indigo-500/10 object-cover shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-zinc-100 truncate">{u.displayName}</div>
                  <div className="text-xs text-zinc-500">@{u.username}</div>
                  {u.bio && <div className="text-xs text-zinc-500 mt-0.5 truncate">{u.bio}</div>}
                </div>
              </Link>
              <FollowButton targetUid={u.uid} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FollowersPage() {
  return <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}><FollowersContent /></Suspense>;
}
