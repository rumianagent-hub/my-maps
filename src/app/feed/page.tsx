"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Post } from "@/lib/types";
import PostCard from "@/components/PostCard";
import { FiUsers } from "react-icons/fi";
import Link from "next/link";

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user || !db) return;

    const fetchFeed = async () => {
      try {
        const followingSnap = await getDocs(collection(db, "following", user.uid, "userFollowing"));
        const followingUids = followingSnap.docs.map((d) => d.id);

        if (followingUids.length === 0) { setPosts([]); setLoading(false); return; }

        const chunks = [];
        for (let i = 0; i < followingUids.length; i += 30) {
          chunks.push(followingUids.slice(i, i + 30));
        }

        const allPosts: Post[] = [];
        for (const chunk of chunks) {
          const q = query(collection(db, "posts"), where("uid", "in", chunk), orderBy("createdAt", "desc"), limit(50));
          const snap = await getDocs(q);
          allPosts.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post)));
        }

        allPosts.sort((a, b) => b.createdAt - a.createdAt);
        setPosts(allPosts.slice(0, 50));
      } catch (err) {
        console.error("Failed to fetch feed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-8">
        {[1, 2, 3].map((i) => <div key={i} className="h-72 shimmer rounded-2xl mb-4" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
          <FiUsers size={20} className="text-rose-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Feed</h1>
          <p className="text-zinc-500 text-sm">Posts from people you follow</p>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-24 text-zinc-500">
          <div className="text-5xl mb-4">👀</div>
          <p className="text-lg mb-4">No posts from people you follow yet.</p>
          <Link href="/explore" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Explore & find people to follow →
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
