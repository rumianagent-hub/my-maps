"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, query, where, orderBy, limit, getDocs, startAfter, DocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Post } from "@/lib/types";
import PostCard from "@/components/PostCard";
import { FiCompass } from "react-icons/fi";

const PAGE_SIZE = 12;

export default function ExplorePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (after?: DocumentSnapshot) => {
    if (!db) return;
    try {
      let q = query(
        collection(db, "posts"),
        where("visibility", "==", "public"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
      if (after) q = query(collection(db, "posts"), where("visibility", "==", "public"), orderBy("createdAt", "desc"), startAfter(after), limit(PAGE_SIZE));

      const snap = await getDocs(q);
      const newPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      return newPosts;
    } catch (err) {
      console.error("Failed to fetch explore posts:", err);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchPosts().then((p) => { setPosts(p || []); setLoading(false); });
  }, [fetchPosts]);

  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    const more = await fetchPosts(lastDoc);
    setPosts((prev) => [...prev, ...(more || [])]);
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-72 shimmer rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-24 pb-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <FiCompass size={20} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Explore</h1>
          <p className="text-zinc-500 text-sm">Discover restaurants from the community</p>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-24 text-zinc-500">
          <div className="text-5xl mb-4">🍽️</div>
          <p className="text-lg">No posts yet. Be the first to share!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            {posts.map((post) => <PostCard key={post.id} post={post} showAuthor />)}
          </div>
          {hasMore && (
            <div className="text-center mt-10">
              <button onClick={loadMore} disabled={loadingMore}
                className="px-8 py-3 bg-white/[0.04] text-zinc-400 rounded-xl text-sm font-medium hover:bg-white/[0.08] border border-white/[0.06] transition-all disabled:opacity-50">
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
