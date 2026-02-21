"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiMap, FiCompass, FiHome, FiLogOut, FiLogIn, FiSearch, FiEdit } from "react-icons/fi";

export default function Navbar() {
  const { user, profile, signInWithGoogle, logout } = useAuth();
  const pathname = usePathname();

  // Hide navbar on setup page
  if (pathname === "/setup") return null;

  const navLink = (href: string, icon: React.ReactNode, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
          active
            ? "bg-indigo-500/10 text-indigo-400"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
        }`}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center glow-sm group-hover:glow-md transition-all">
            <FiMap className="text-white" size={16} />
          </div>
          <span className="gradient-text font-bold text-lg tracking-tight">MyMaps</span>
        </Link>

        <div className="flex items-center gap-1">
          {user && profile?.onboarded ? (
            <>
              {navLink("/", <FiHome size={16} />, "Home")}
              {navLink("/explore", <FiCompass size={16} />, "Explore")}
              {navLink("/search", <FiSearch size={16} />, "Search")}
              <Link
                href="/add"
                className="flex items-center gap-1.5 btn-primary px-4 py-2 text-sm ml-2"
              >
                <FiEdit size={15} />
                <span className="hidden sm:inline">Post</span>
              </Link>
              <Link href="/profile" className="ml-3">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="" className="w-9 h-9 rounded-full ring-2 ring-indigo-500/30 hover:ring-indigo-500/60 transition-all" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-bold">
                    {profile?.displayName?.[0] || "?"}
                  </div>
                )}
              </Link>
              <button onClick={logout} className="p-2 text-zinc-600 hover:text-zinc-400 transition-colors ml-1">
                <FiLogOut size={16} />
              </button>
            </>
          ) : !user ? (
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-2 bg-white text-zinc-900 px-5 py-2 rounded-xl text-sm font-medium hover:bg-zinc-100 transition-all shadow-lg shadow-white/5"
            >
              <FiLogIn size={16} />
              Sign In
            </button>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
