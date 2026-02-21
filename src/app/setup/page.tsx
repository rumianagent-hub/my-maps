"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { FiCheck, FiX, FiLoader, FiMap } from "react-icons/fi";

export default function SetupPage() {
  const { user, profile, loading, updateProfile, checkUsernameAvailable } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (profile?.onboarded) router.push("/");
    if (profile?.displayName) setDisplayName(profile.displayName);
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (username.length < 3) { setAvailable(null); return; }
    const timer = setTimeout(async () => {
      setChecking(true);
      const ok = await checkUsernameAvailable(username);
      setAvailable(ok);
      setChecking(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [username, checkUsernameAvailable]);

  const isValidUsername = (u: string) => /^[a-z0-9_]{3,20}$/.test(u);

  const handleSubmit = async () => {
    setError("");
    if (!isValidUsername(username)) { setError("3-20 chars, lowercase letters, numbers, underscores only"); return; }
    if (!available) { setError("Username is taken"); return; }
    if (!displayName.trim()) { setError("Display name is required"); return; }

    setSubmitting(true);
    try {
      await updateProfile({ username: username.toLowerCase(), displayName: displayName.trim(), bio: bio.trim(), onboarded: true });
      router.push("/");
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/[0.07] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full animate-fade-in relative">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl accent-gradient flex items-center justify-center mx-auto mb-5 glow-md">
            <FiMap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-100">Welcome to MyMaps!</h1>
          <p className="text-zinc-500 mt-2 text-lg">Let&apos;s set up your profile</p>
        </div>

        <div className="space-y-5 bg-[var(--bg-card)] rounded-2xl p-7 border border-white/[0.06]">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Username *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">@</span>
              <input
                value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="yourname" maxLength={20}
                className="w-full pl-9 pr-10 py-3.5 bg-[var(--bg-secondary)] border border-white/[0.06] rounded-xl text-zinc-100 placeholder:text-zinc-700 text-sm"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {checking && <FiLoader size={16} className="text-zinc-500 animate-spin" />}
                {!checking && available === true && <FiCheck size={16} className="text-emerald-500" />}
                {!checking && available === false && <FiX size={16} className="text-rose-500" />}
              </div>
            </div>
            <p className="text-xs text-zinc-600 mt-1.5">3-20 chars, lowercase, numbers, underscores</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Display Name *</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your Name"
              className="w-full px-4 py-3.5 bg-[var(--bg-secondary)] border border-white/[0.06] rounded-xl text-zinc-100 placeholder:text-zinc-700 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Food lover, explorer..." rows={2}
              className="w-full px-4 py-3.5 bg-[var(--bg-secondary)] border border-white/[0.06] rounded-xl text-zinc-100 placeholder:text-zinc-700 resize-none text-sm" />
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <button onClick={handleSubmit} disabled={submitting || !available || !displayName.trim()}
            className="w-full py-4 btn-primary text-base">
            {submitting ? "Setting up..." : "Let's Go! 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}
