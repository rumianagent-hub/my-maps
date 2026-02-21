"use client";

import { useEffect, useState, Suspense } from "react";
import { doc, getDoc, deleteDoc, setDoc, increment } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Post, UserProfile } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { FiMapPin, FiStar, FiCalendar, FiArrowLeft, FiShare, FiEdit2, FiTrash2 } from "react-icons/fi";
import { useToast } from "@/components/Toast";
import PhotoCarousel from "@/components/PhotoCarousel";
import { format } from "date-fns";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

function PostContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const { user } = useAuth();
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id || !db) { setLoading(false); return; }
    const fetchData = async () => {
      const snap = await getDoc(doc(db, "posts", id));
      if (snap.exists()) {
        const p = { id: snap.id, ...snap.data() } as Post;
        setPost(p);
        const uSnap = await getDoc(doc(db, "users", p.uid));
        if (uSnap.exists()) setAuthor(uSnap.data() as UserProfile);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const isOwner = user && post && user.uid === post.uid;

  const handleDelete = async () => {
    if (!post || !user || !db) return;
    setDeleting(true);
    try {
      // Delete photos from storage
      for (const url of post.photoUrls) {
        try {
          // Extract storage path from download URL
          const match = url.match(/o\/(.+?)\?/);
          if (match) {
            const path = decodeURIComponent(match[1]);
            await deleteObject(ref(storage, path));
          }
        } catch {
          // Photo may already be deleted, continue
        }
      }
      // Delete post document
      await deleteDoc(doc(db, "posts", post.id));
      // Decrement post count
      await setDoc(doc(db, "users", user.uid), { postCount: increment(-1) }, { merge: true });
      router.push("/profile");
    } catch (err) {
      console.error("Failed to delete post:", err);
      alert("Failed to delete post. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/explore");
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!post) return <div className="flex flex-col items-center justify-center min-h-screen text-zinc-500"><p>Post not found</p><Link href="/" className="text-indigo-400 mt-2">Go home</Link></div>;

  return (
    <div className="max-w-lg mx-auto px-4 pt-20 pb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <button onClick={handleBack} className="flex items-center gap-2 p-2 hover:bg-white/[0.06] rounded-xl transition-colors text-zinc-400 hover:text-zinc-200">
          <FiArrowLeft size={20} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-1">
          {isOwner && (
            <>
              <button onClick={() => router.push(`/post/edit?id=${post.id}`)} className="p-2 hover:bg-white/[0.06] rounded-xl transition-colors" title="Edit post">
                <FiEdit2 size={18} className="text-zinc-400" />
              </button>
              <button onClick={() => setShowDeleteModal(true)} className="p-2 hover:bg-rose-500/10 rounded-xl transition-colors" title="Delete post">
                <FiTrash2 size={18} className="text-zinc-400 hover:text-rose-400" />
              </button>
            </>
          )}
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast("Link copied!"); }} className="p-2 hover:bg-white/[0.06] rounded-xl transition-colors">
            <FiShare size={18} className="text-zinc-400" />
          </button>
        </div>
      </div>

      {post.photoUrls.length > 0 && (
        <PhotoCarousel
          photos={post.photoUrls}
          alt={post.placeName}
          className="rounded-2xl mb-5 border border-white/[0.06]"
        />
      )}

      <Link href={`/place?id=${post.placeId}`} className="group">
        <h1 className="text-2xl font-bold text-zinc-100 group-hover:text-indigo-400 transition-colors">{post.placeName}</h1>
        <div className="flex items-center gap-1.5 text-zinc-500 text-sm mt-1.5">
          <FiMapPin size={14} className="text-indigo-400/60" />
          {post.city || post.placeAddress}
        </div>
      </Link>

      <div className="flex items-center gap-4 mt-4 text-sm text-zinc-500">
        {post.rating > 0 && (
          <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full font-medium">
            <FiStar size={14} className="fill-amber-400" />{post.rating}/5
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <FiCalendar size={14} />{format(new Date(post.visitedAt), "MMMM d, yyyy")}
        </span>
      </div>

      {post.caption && <p className="text-zinc-300 mt-5 leading-relaxed text-[15px]">{post.caption}</p>}

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-5">
          {post.tags.map((t) => <span key={t} className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-sm font-medium">{t}</span>)}
        </div>
      )}

      {author && (
        <Link href={`/user?u=${author.username}`} className="flex items-center gap-3 mt-8 p-4 bg-[var(--bg-card)] rounded-2xl border border-white/[0.06] card-hover">
          <img src={author.photoURL} alt="" className="w-11 h-11 rounded-xl ring-2 ring-indigo-500/20" />
          <div>
            <div className="font-semibold text-sm text-zinc-100">{author.displayName}</div>
            <div className="text-xs text-zinc-500">@{author.username}</div>
          </div>
        </Link>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="bg-[var(--bg-card)] border border-white/[0.08] rounded-2xl p-6 max-w-sm mx-4 w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Delete this post?</h3>
            <p className="text-sm text-zinc-400 mb-6">This will permanently remove this post and its photos. This can&apos;t be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting}
                className="flex-1 py-2.5 bg-white/[0.04] text-zinc-400 rounded-xl text-sm hover:bg-white/[0.08] transition-colors disabled:opacity-40">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-rose-500/20 text-rose-400 rounded-xl text-sm font-medium hover:bg-rose-500/30 transition-colors disabled:opacity-40">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PostPage() {
  return <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}><PostContent /></Suspense>;
}
