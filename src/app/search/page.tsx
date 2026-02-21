"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, query, getDocs, orderBy, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Post, UserProfile } from "@/lib/types";
import PostCard from "@/components/PostCard";
import { FiSearch, FiX, FiUser, FiMapPin, FiHash } from "react-icons/fi";
import Link from "next/link";

type Tab = "all" | "restaurants" | "people" | "tags";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);

  // Load initial data
  useEffect(() => {
    if (!db) return;
    const load = async () => {
      try {
        const [postsSnap, usersSnap] = await Promise.all([
          getDocs(query(collection(db, "posts"), where("visibility", "==", "public"), orderBy("createdAt", "desc"), limit(100))),
          getDocs(query(collection(db, "users"), where("onboarded", "==", true), limit(100))),
        ]);
        const p = postsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
        const u = usersSnap.docs.map((d) => d.data() as UserProfile);
        setAllPosts(p);
        setAllUsers(u);
        setPosts(p.slice(0, 12));
        setUsers(u);
      } catch (err) {
        console.error("Search load failed:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setPosts(allPosts.slice(0, 12));
      setUsers(allUsers);
      setSearched(false);
      return;
    }

    setSearched(true);
    const q = searchQuery.toLowerCase().trim();

    const filteredPosts = allPosts.filter((p) =>
      p.placeName.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.caption?.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)) ||
      p.placeAddress?.toLowerCase().includes(q) ||
      p.authorUsername?.toLowerCase().includes(q)
    );

    const filteredUsers = allUsers.filter((u) =>
      u.displayName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.bio?.toLowerCase().includes(q) ||
      u.homeCity?.toLowerCase().includes(q)
    );

    setPosts(filteredPosts);
    setUsers(filteredUsers);
  }, [searchQuery, allPosts, allUsers]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All", icon: <FiSearch size={14} /> },
    { id: "restaurants", label: "Restaurants", icon: <FiMapPin size={14} /> },
    { id: "people", label: "People", icon: <FiUser size={14} /> },
    { id: "tags", label: "Tags", icon: <FiHash size={14} /> },
  ];

  // Extract unique tags from filtered posts
  const tagCounts = new Map<string, number>();
  posts.forEach((p) => p.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1)));
  const sortedTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-8 animate-fade-in">
      {/* Search input */}
      <div className="relative mb-5">
        <FiSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search restaurants, people, tags, cuisines..."
          autoFocus
          className="w-full pl-11 pr-10 py-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-zinc-100 placeholder:text-zinc-600 text-sm"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/[0.06] rounded-lg transition-colors">
            <FiX size={16} className="text-zinc-500" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.id ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20" : "text-zinc-500 bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06]"
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 shimmer rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* People results */}
          {(tab === "all" || tab === "people") && users.length > 0 && (
            <div className="mb-8">
              {tab === "all" && <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">People</h2>}
              <div className="space-y-2">
                {users.slice(0, tab === "people" ? 50 : 5).map((u) => (
                  <Link key={u.uid} href={`/user?u=${u.username}`}
                    className="flex items-center gap-3 p-3.5 bg-white/[0.03] rounded-xl border border-white/[0.04] hover:bg-white/[0.06] transition-all">
                    <img src={u.photoURL || "/default-avatar.png"} alt="" className="w-11 h-11 rounded-xl ring-2 ring-indigo-500/10 object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-zinc-100 truncate">{u.displayName}</div>
                      <div className="text-xs text-zinc-500">@{u.username}</div>
                      {u.bio && <div className="text-xs text-zinc-500 mt-0.5 truncate">{u.bio}</div>}
                    </div>
                    <div className="text-xs text-zinc-600 shrink-0">
                      {u.postCount || 0} posts
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tags results */}
          {(tab === "all" || tab === "tags") && sortedTags.length > 0 && (
            <div className="mb-8">
              {tab === "all" && <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Tags</h2>}
              <div className="flex flex-wrap gap-2">
                {sortedTags.slice(0, tab === "tags" ? 50 : 10).map(([tag, count]) => (
                  <button key={tag} onClick={() => setSearchQuery(tag)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 text-indigo-400 rounded-full text-sm font-medium border border-indigo-500/10 hover:border-indigo-500/20 hover:bg-indigo-500/15 transition-all">
                    <FiHash size={13} />
                    {tag}
                    <span className="text-indigo-400/50 text-xs">({count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Restaurant/Post results */}
          {(tab === "all" || tab === "restaurants") && posts.length > 0 && (
            <div>
              {tab === "all" && <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Restaurants</h2>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
                {posts.slice(0, tab === "restaurants" ? 50 : 6).map((post) => (
                  <PostCard key={post.id} post={post} showAuthor />
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {searched && posts.length === 0 && users.length === 0 && (
            <div className="text-center py-20 text-zinc-500">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-lg">No results for &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
