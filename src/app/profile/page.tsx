"use client";

import { useAuth } from "@/context/AuthContext";
import ProfileTabs from "@/components/ProfileTabs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiShare, FiCheck, FiX, FiLoader, FiSettings } from "react-icons/fi";
import { useToast } from "@/components/Toast";
import Link from "next/link";

export default function ProfilePage() {
  const { user, profile, loading, updateProfile, checkUsernameAvailable } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) { setUsername(profile.username); setDisplayName(profile.displayName); setBio(profile.bio); }
  }, [profile]);

  useEffect(() => {
    if (!editing || username === profile?.username) { setAvailable(null); return; }
    if (username.length < 3) { setAvailable(null); return; }
    const timer = setTimeout(async () => {
      setChecking(true);
      setAvailable(await checkUsernameAvailable(username));
      setChecking(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [username, editing, profile?.username, checkUsernameAvailable]);

  const handleSave = async () => {
    if (username !== profile?.username && !available) return;
    setSaving(true);
    try {
      await updateProfile({ username, displayName, bio });
      setEditing(false);
    } catch { /* handled in context */ }
    finally { setSaving(false); }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/user?u=${profile?.username}`);
    toast("Profile link copied!");
  };

  if (loading || !user || !profile) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-8 animate-fade-in">
      {/* Profile header */}
      <div className="flex items-start gap-5 mb-8">
        <div className="relative">
          <img src={profile.photoURL || "/default-avatar.png"} alt={profile.displayName}
            className="w-20 h-20 rounded-2xl ring-2 ring-indigo-500/20 object-cover" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[var(--bg-primary)]" />
        </div>

        <div className="flex-1">
          {editing ? (
            <div className="space-y-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">@</span>
                <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  className="w-full pl-8 pr-10 py-2.5 bg-[var(--bg-secondary)] border border-white/[0.06] rounded-xl text-sm text-zinc-100" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checking && <FiLoader size={14} className="text-zinc-500 animate-spin" />}
                  {!checking && available === true && <FiCheck size={14} className="text-emerald-500" />}
                  {!checking && available === false && <FiX size={14} className="text-rose-500" />}
                </div>
              </div>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display Name"
                className="w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-white/[0.06] rounded-xl text-sm text-zinc-100" />
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" rows={2}
                className="w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-white/[0.06] rounded-xl text-sm resize-none text-zinc-100" />
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 btn-primary text-sm">{saving ? "Saving..." : "Save"}</button>
                <button onClick={() => { setEditing(false); setUsername(profile.username); setDisplayName(profile.displayName); setBio(profile.bio); }}
                  className="px-4 py-2 bg-white/[0.04] text-zinc-400 rounded-xl text-sm hover:bg-white/[0.08] transition-colors">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-zinc-100">{profile.displayName}</h1>
              <p className="text-sm text-zinc-500">@{profile.username}</p>
              {profile.bio && <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">{profile.bio}</p>}
              <div className="flex gap-5 mt-3 text-sm text-zinc-500">
                <span><strong className="text-zinc-200 font-semibold">{profile.postCount || 0}</strong> posts</span>
                <Link href={`/followers?uid=${user.uid}&tab=followers`} className="hover:text-zinc-300 transition-colors">
                  <strong className="text-zinc-200 font-semibold">{profile.followerCount || 0}</strong> followers
                </Link>
                <Link href={`/followers?uid=${user.uid}&tab=following`} className="hover:text-zinc-300 transition-colors">
                  <strong className="text-zinc-200 font-semibold">{profile.followingCount || 0}</strong> following
                </Link>
              </div>
            </>
          )}
        </div>

        {!editing && (
          <div className="flex gap-1.5">
            <button onClick={() => setEditing(true)} className="p-2.5 hover:bg-white/[0.06] rounded-xl transition-colors">
              <FiSettings size={16} className="text-zinc-500" />
            </button>
            <button onClick={handleShare} className="p-2.5 hover:bg-white/[0.06] rounded-xl transition-colors">
              <FiShare size={16} className="text-zinc-500" />
            </button>
          </div>
        )}
      </div>

      <ProfileTabs uid={user.uid} />
    </div>
  );
}
