"use client";

import { Post } from "@/lib/types";
import { FiMapPin, FiStar, FiCalendar } from "react-icons/fi";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import PhotoCarousel from "./PhotoCarousel";

export default function PostCard({ post, showAuthor = false }: { post: Post; showAuthor?: boolean }) {
  const router = useRouter();

  const authorOverlay = showAuthor && post.authorName ? (
    <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
      {post.authorPhoto && <img src={post.authorPhoto} alt="" className="w-6 h-6 rounded-full ring-2 ring-black/30" />}
      <span className="text-xs text-white/80 font-medium">@{post.authorUsername}</span>
    </div>
  ) : null;

  const ratingOverlay = post.rating > 0 ? (
    <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-medium text-amber-400 border border-white/10 z-10">
      <FiStar size={11} className="fill-amber-400" />
      {post.rating}
    </div>
  ) : null;

  const overlay = (
    <>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
      {ratingOverlay}
      {authorOverlay}
    </>
  );

  return (
    <div className="block group">
      <div className="bg-[var(--bg-card)] rounded-2xl overflow-hidden border border-white/[0.06] card-hover">
        {post.photoUrls.length > 0 && (
          <PhotoCarousel
            photos={post.photoUrls}
            alt={post.placeName}
            overlay={overlay}
          />
        )}
        <div
          className="p-4 cursor-pointer"
          onClick={() => router.push(`/post?id=${post.id}`)}
        >
          {!post.photoUrls.length && showAuthor && post.authorName && (
            <div className="flex items-center gap-2 mb-2">
              {post.authorPhoto && <img src={post.authorPhoto} alt="" className="w-5 h-5 rounded-full" />}
              <span className="text-xs text-zinc-500">@{post.authorUsername}</span>
            </div>
          )}
          <h3 className="font-semibold text-zinc-100 text-base truncate hover:text-indigo-400 transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); router.push(`/place?id=${post.placeId}`); }}>{post.placeName}</h3>
          <div className="flex items-center gap-1.5 text-zinc-500 text-sm mt-1">
            <FiMapPin size={13} className="text-indigo-400/60" />
            <span className="truncate">{post.city || post.placeAddress}</span>
          </div>
          {post.caption && <p className="text-zinc-400 text-sm mt-2 line-clamp-2">{post.caption}</p>}
          <div className="flex items-center gap-3 mt-3 text-xs text-zinc-600">
            <span className="flex items-center gap-1">
              <FiCalendar size={12} />
              {format(new Date(post.visitedAt), "MMM d, yyyy")}
            </span>
          </div>
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {post.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-medium">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
