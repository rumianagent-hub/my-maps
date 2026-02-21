"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, startAfter, DocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Post } from "@/lib/types";
import PostCard from "@/components/PostCard";
import { FiMap, FiCamera, FiShare2, FiSearch, FiCompass } from "react-icons/fi";
import Link from "next/link";

export default function Home() {
  const { user, profile, signInWithGoogle, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"foryou" | "following">("foryou");

  // Explore feed state (for landing page)
  const [explorePosts, setExplorePosts] = useState<Post[]>([]);
  const [exploreLoading, setExploreLoading] = useState(true);
  const [exploreLastDoc, setExploreLastDoc] = useState<DocumentSnapshot | null>(null);
  const [exploreHasMore, setExploreHasMore] = useState(true);
  const [exploreLoadingMore, setExploreLoadingMore] = useState(false);

  // Fetch explore posts for landing page
  useEffect(() => {
    if (authLoading) return;
    if (user && profile?.onboarded) { setExploreLoading(false); return; }
    if (!db) { setExploreLoading(false); return; }
    const fetchExplore = async () => {
      try {
        const q = query(collection(db, "posts"), where("visibility", "==", "public"), orderBy("createdAt", "desc"), limit(12));
        const snap = await getDocs(q);
        setExplorePosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post)));
        setExploreLastDoc(snap.docs[snap.docs.length - 1] || null);
        setExploreHasMore(snap.docs.length === 12);
      } catch (err) {
        console.error("Failed to fetch explore posts:", err);
      } finally {
        setExploreLoading(false);
      }
    };
    fetchExplore();
  }, [user, profile, authLoading]);

  const loadMoreExplore = async () => {
    if (!exploreLastDoc || exploreLoadingMore || !db) return;
    setExploreLoadingMore(true);
    try {
      const q = query(collection(db, "posts"), where("visibility", "==", "public"), orderBy("createdAt", "desc"), startAfter(exploreLastDoc), limit(12));
      const snap = await getDocs(q);
      const newPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
      setExplorePosts((prev) => [...prev, ...newPosts]);
      setExploreLastDoc(snap.docs[snap.docs.length - 1] || null);
      setExploreHasMore(snap.docs.length === 12);
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setExploreLoadingMore(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user || !profile?.onboarded || !db) {
      setLoading(false);
      return;
    }

    const fetchPosts = async () => {
      setLoading(true);
      try {
        if (tab === "following") {
          // Fetch posts from people you follow
          const followingSnap = await getDocs(collection(db, "following", user.uid, "userFollowing"));
          const followingUids = followingSnap.docs.map((d) => d.id);

          if (followingUids.length === 0) { setPosts([]); setLoading(false); return; }

          const allPosts: Post[] = [];
          for (let i = 0; i < followingUids.length; i += 30) {
            const chunk = followingUids.slice(i, i + 30);
            const q = query(collection(db, "posts"), where("uid", "in", chunk), orderBy("createdAt", "desc"), limit(50));
            const snap = await getDocs(q);
            allPosts.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post)));
          }
          allPosts.sort((a, b) => b.createdAt - a.createdAt);
          setPosts(allPosts.slice(0, 50));
        } else {
          // "For You" — mix of local posts (same city) + recent public posts
          const allPosts: Post[] = [];

          // Get user's city from their posts or profile
          let userCity = profile.homeCity || "";
          if (!userCity) {
            const myPosts = await getDocs(query(collection(db, "posts"), where("uid", "==", user.uid), limit(1)));
            if (!myPosts.empty) userCity = myPosts.docs[0].data().city || "";
          }

          // Fetch public posts (recent)
          const publicQ = query(collection(db, "posts"), where("visibility", "==", "public"), orderBy("createdAt", "desc"), limit(30));
          const publicSnap = await getDocs(publicQ);
          allPosts.push(...publicSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Post)));

          // Deduplicate and sort — prioritize same city
          const seen = new Set<string>();
          const unique = allPosts.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });

          // Sort: same city first, then by date
          unique.sort((a, b) => {
            const aLocal = userCity && a.city?.toLowerCase() === userCity.toLowerCase() ? 1 : 0;
            const bLocal = userCity && b.city?.toLowerCase() === userCity.toLowerCase() ? 1 : 0;
            if (aLocal !== bLocal) return bLocal - aLocal;
            return b.createdAt - a.createdAt;
          });

          setPosts(unique.slice(0, 40));
        }
      } catch (err) {
        console.error("Failed to fetch posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [user, profile, authLoading, tab]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Logged in & onboarded — home feed
  if (user && profile?.onboarded) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-8 animate-fade-in">
        {/* Search bar */}
        <Link href="/search" className="flex items-center gap-3 w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl mb-6 text-zinc-500 hover:bg-white/[0.06] transition-colors">
          <FiSearch size={18} />
          <span className="text-sm">Search restaurants, people, tags...</span>
        </Link>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-1 mb-6 border border-white/[0.04]">
          <button onClick={() => setTab("foryou")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === "foryou" ? "bg-indigo-500/15 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}>
            For You
          </button>
          <button onClick={() => setTab("following")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === "following" ? "bg-indigo-500/15 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}>
            Following
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-72 shimmer rounded-2xl" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <div className="text-5xl mb-4">{tab === "following" ? "👀" : "🍽️"}</div>
            <p className="text-lg mb-2">
              {tab === "following" ? "No posts from people you follow yet." : "No posts yet."}
            </p>
            <Link href="/explore" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Explore & discover →
            </Link>
          </div>
        ) : (
          <div className="space-y-4 stagger">
            {posts.map((post) => <PostCard key={post.id} post={post} showAuthor />)}
          </div>
        )}
      </div>
    );
  }

  // Landing page
  return (
    <div className="min-h-screen flex flex-col">
      <section className="flex items-center justify-center px-4 py-20 relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/[0.07] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-rose-500/[0.05] rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-xl text-center animate-fade-in relative">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-indigo-500/20">
            🍽️ Instagram for places you&apos;ve actually been
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold leading-[1.1] tracking-tight">
            Your restaurants.
            <br />
            <span className="gradient-text">Your map.</span>
          </h1>

          <p className="text-zinc-500 text-lg mt-6 max-w-md mx-auto leading-relaxed">
            Track every restaurant you visit, share your favorites, and discover new spots from friends.
          </p>

          <button onClick={signInWithGoogle}
            className="mt-10 inline-flex items-center gap-3 bg-white text-zinc-900 px-8 py-4 rounded-2xl font-semibold hover:bg-zinc-100 transition-all shadow-2xl shadow-white/10 hover:shadow-white/20 hover:-translate-y-0.5">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>

          <div className="grid grid-cols-3 gap-8 mt-20">
            {[
              { icon: FiCamera, title: "Log Visits", desc: "Photos, notes, ratings" },
              { icon: FiMap, title: "Your Map", desc: "Pins of everywhere" },
              { icon: FiShare2, title: "Share", desc: "Public profile links" },
            ].map((f) => (
              <div key={f.title} className="text-center group">
                <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-indigo-500/10 group-hover:border-indigo-500/20 group-hover:bg-indigo-500/15 transition-all">
                  <f.icon size={24} className="text-indigo-400" />
                </div>
                <div className="font-medium text-sm text-zinc-200">{f.title}</div>
                <div className="text-xs text-zinc-600 mt-1">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Explore feed for visitors */}
      <section className="max-w-4xl mx-auto px-4 pb-16 w-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <FiCompass size={20} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Explore</h2>
            <p className="text-zinc-500 text-sm">See what people are sharing</p>
          </div>
        </div>

        {exploreLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-72 shimmer rounded-2xl" />)}
          </div>
        ) : explorePosts.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <div className="text-5xl mb-4">🍽️</div>
            <p className="text-lg">No posts yet. Sign in and be the first!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
              {explorePosts.map((post) => <PostCard key={post.id} post={post} showAuthor />)}
            </div>
            {exploreHasMore && (
              <div className="text-center mt-10">
                <button onClick={loadMoreExplore} disabled={exploreLoadingMore}
                  className="px-8 py-3 bg-white/[0.04] text-zinc-400 rounded-xl text-sm font-medium hover:bg-white/[0.08] border border-white/[0.06] transition-all disabled:opacity-50">
                  {exploreLoadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
