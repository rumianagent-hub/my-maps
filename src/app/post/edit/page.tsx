"use client";

import { useEffect, useState, Suspense } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Post } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { FiArrowLeft, FiStar, FiX, FiCheck } from "react-icons/fi";
import { useSearchParams, useRouter } from "next/navigation";

const SUGGESTED_TAGS = [
  "🍕 pizza", "🍣 sushi", "🍔 burgers", "🌮 tacos", "🍜 noodles", "🥗 healthy",
  "☕ brunch", "🍷 wine", "🍺 beer", "🥂 date-night", "👨‍👩‍👧 family", "💰 budget",
  "✨ fine-dining", "🔥 must-try", "🌱 vegan", "🍝 pasta", "🥘 curry", "🍰 dessert",
];

function EditPostContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [caption, setCaption] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (!id || !db) { setLoading(false); return; }
    const fetchPost = async () => {
      const snap = await getDoc(doc(db, "posts", id));
      if (snap.exists()) {
        const p = { id: snap.id, ...snap.data() } as Post;
        setPost(p);
        setCaption(p.caption);
        setRating(p.rating);
        setTags(p.tags);
      }
      setLoading(false);
    };
    fetchPost();
  }, [id]);

  // Redirect if not owner
  useEffect(() => {
    if (!loading && post && user && post.uid !== user.uid) {
      router.push(`/post?id=${post.id}`);
    }
  }, [loading, post, user, router]);

  const toggleTag = (tag: string) => {
    const clean = tag.replace(/^[^\w]+ /, "");
    if (tags.includes(clean)) {
      setTags(tags.filter((t) => t !== clean));
    } else if (tags.length < 8) {
      setTags([...tags, clean]);
    }
  };

  const handleSave = async () => {
    if (!post || !id || !db) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "posts", id), {
        caption,
        rating,
        tags,
      });
      router.push(`/post?id=${id}`);
    } catch (err) {
      console.error("Failed to update post:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!post) return <div className="flex flex-col items-center justify-center min-h-screen text-zinc-500"><p>Post not found</p></div>;

  return (
    <div className="max-w-lg mx-auto px-4 pt-20 pb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 p-2 hover:bg-white/[0.06] rounded-xl transition-colors text-zinc-400 hover:text-zinc-200">
          <FiArrowLeft size={20} />
          <span className="text-sm font-medium">Cancel</span>
        </button>
        <h1 className="text-lg font-bold text-zinc-100">Edit Post</h1>
        <div className="w-20" />
      </div>

      {/* Preview */}
      {post.photoUrls[0] && (
        <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] mb-6">
          <img src={post.photoUrls[0]} alt={post.placeName} className="w-full h-40 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3">
            <div className="font-semibold text-white text-sm">{post.placeName}</div>
            <div className="text-white/60 text-xs">{post.city || post.placeAddress}</div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">Rating</label>
          <div className="flex gap-2 justify-center py-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n}
                onClick={() => setRating(n === rating ? 0 : n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-all hover:scale-125 active:scale-95">
                <FiStar size={32} className={`transition-colors ${
                  n <= (hoverRating || rating) ? "text-amber-400 fill-amber-400" : "text-zinc-700"
                }`} />
              </button>
            ))}
          </div>
        </div>

        {/* Caption */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Caption</label>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
            placeholder="What should people know?"
            rows={3}
            className="w-full px-4 py-3.5 bg-[var(--bg-secondary)] border border-white/[0.06] rounded-xl text-zinc-100 placeholder:text-zinc-600 resize-none text-sm leading-relaxed" />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Tags</label>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-medium border border-indigo-500/10">
                  {t}
                  <button onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-rose-400 transition-colors">
                    <FiX size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_TAGS.filter((t) => !tags.includes(t.replace(/^[^\w]+ /, ""))).slice(0, 12).map((t) => (
              <button key={t} onClick={() => toggleTag(t)}
                className="px-3 py-1.5 bg-white/[0.03] text-zinc-500 rounded-full text-xs border border-white/[0.04] hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/10 transition-all">
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-4 btn-primary text-base font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
          <FiCheck size={18} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

export default function EditPostPage() {
  return <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}><EditPostContent /></Suspense>;
}
