"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Post } from "@/lib/types";
import { useMapsLoaded } from "@/components/GoogleMapsLoader";
import PostCard from "@/components/PostCard";
import { FiMapPin, FiStar, FiPhone, FiClock, FiExternalLink, FiArrowLeft, FiNavigation, FiDollarSign, FiGlobe } from "react-icons/fi";
import { useSearchParams, useRouter } from "next/navigation";

interface PlaceDetails {
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  userRatingsTotal: number;
  priceLevel: number;
  hours: string[];
  isOpen: boolean | null;
  photos: string[];
  types: string[];
  lat: number;
  lng: number;
  url: string; // Google Maps link
}

function PlaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const placeId = searchParams.get("id");
  const mapsLoaded = useMapsLoaded();
  const [posts, setPosts] = useState<Post[]>([]);
  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [postsLoading, setPostsLoading] = useState(true);
  const [placeLoading, setPlaceLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  // Fetch posts from Firestore
  useEffect(() => {
    if (!placeId || !db) { setPostsLoading(false); return; }
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, "posts"), where("placeId", "==", placeId));
        const snap = await getDocs(q);
        setPosts(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as Post))
            .filter((p) => p.visibility === "public")
            .sort((a, b) => b.createdAt - a.createdAt)
        );
      } catch (err) {
        console.error("Failed to fetch place posts:", err);
      } finally {
        setPostsLoading(false);
      }
    };
    fetchPosts();
  }, [placeId]);

  // Fetch place details from Google Places API
  useEffect(() => {
    if (!placeId || !mapsLoaded) return;

    const service = new google.maps.places.PlacesService(
      placeholderRef.current || document.createElement("div")
    );

    service.getDetails(
      {
        placeId,
        fields: [
          "name", "formatted_address", "formatted_phone_number",
          "website", "rating", "user_ratings_total", "price_level",
          "opening_hours", "photos", "types", "geometry", "url",
        ],
      },
      (result, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && result) {
          const photos = result.photos
            ? result.photos.slice(0, 6).map((p) => p.getUrl({ maxWidth: 800 }))
            : [];

          setPlace({
            name: result.name || "",
            address: result.formatted_address || "",
            phone: result.formatted_phone_number || "",
            website: result.website || "",
            rating: result.rating || 0,
            userRatingsTotal: result.user_ratings_total || 0,
            priceLevel: result.price_level ?? -1,
            hours: result.opening_hours?.weekday_text || [],
            isOpen: result.opening_hours?.isOpen?.() ?? null,
            photos,
            types: result.types || [],
            lat: result.geometry?.location?.lat() || 0,
            lng: result.geometry?.location?.lng() || 0,
            url: result.url || "",
          });
        }
        setPlaceLoading(false);
      }
    );
  }, [placeId, mapsLoaded]);

  // Render mini map
  useEffect(() => {
    if (!place || !mapsLoaded || !mapRef.current) return;
    const map = new google.maps.Map(mapRef.current, {
      center: { lat: place.lat, lng: place.lng },
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#8888aa" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a3e" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e0e1a" }] },
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
    });
    new google.maps.Marker({
      position: { lat: place.lat, lng: place.lng },
      map,
      title: place.name,
    });
  }, [place, mapsLoaded]);

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/explore");
  };

  const priceLevelText = (level: number) => {
    if (level < 0) return null;
    return "$".repeat(level || 1);
  };

  const formatType = (type: string) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const loading = placeLoading && postsLoading;

  // Community stats from our posts
  const ourRatings = posts.filter((p) => p.rating > 0);
  const communityAvg = ourRatings.length > 0
    ? ourRatings.reduce((sum, p) => sum + p.rating, 0) / ourRatings.length
    : 0;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-8">
        <div className="h-64 shimmer rounded-2xl mb-6" />
        <div className="h-8 w-64 shimmer rounded-lg mb-3" />
        <div className="h-4 w-48 shimmer rounded-lg mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-72 shimmer rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // Fallback name from posts if Places API failed
  const displayName = place?.name || posts[0]?.placeName || "Unknown Place";
  const displayAddress = place?.address || posts[0]?.placeAddress || "";
  const displayCity = posts[0]?.city || "";

  return (
    <div className="max-w-4xl mx-auto px-4 pt-20 pb-8 animate-fade-in">
      <div ref={placeholderRef} className="hidden" />

      <button onClick={handleBack} className="flex items-center gap-2 p-2 hover:bg-white/[0.06] rounded-xl transition-colors text-zinc-400 hover:text-zinc-200 mb-6">
        <FiArrowLeft size={20} />
        <span className="text-sm font-medium">Back</span>
      </button>

      {/* Google Photos carousel */}
      {place && place.photos.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide -mx-4 px-4">
          {place.photos.map((url, i) => (
            <img key={i} src={url} alt={displayName}
              className="h-52 rounded-2xl object-cover flex-shrink-0 border border-white/[0.06]" />
          ))}
        </div>
      )}

      {/* Place header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">{displayName}</h1>
            <div className="flex items-center gap-1.5 text-zinc-500 mt-2">
              <FiMapPin size={16} className="text-indigo-400/60 flex-shrink-0" />
              <span>{displayAddress}</span>
            </div>
          </div>
          {place?.url && (
            <a href={place.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl text-sm font-medium border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors flex-shrink-0">
              <FiNavigation size={14} />
              Directions
            </a>
          )}
        </div>

        {/* Tags / cuisine types */}
        {place && place.types.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {place.types
              .filter((t) => !["point_of_interest", "establishment", "food", "store"].includes(t))
              .slice(0, 5)
              .map((t) => (
                <span key={t} className="px-3 py-1 bg-white/[0.04] text-zinc-400 rounded-full text-xs font-medium border border-white/[0.04]">
                  {formatType(t)}
                </span>
              ))}
          </div>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-4 mt-5">
          {place && place.rating > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-full text-sm font-medium">
              <FiStar size={14} className="fill-amber-400" />
              {place.rating.toFixed(1)}
              <span className="text-amber-400/50 ml-0.5">({place.userRatingsTotal.toLocaleString()})</span>
            </div>
          )}
          {place && place.priceLevel >= 0 && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full text-sm font-medium">
              <FiDollarSign size={14} />
              {priceLevelText(place.priceLevel)}
            </div>
          )}
          {place?.isOpen !== null && (
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              place?.isOpen ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
            }`}>
              {place?.isOpen ? "Open Now" : "Closed"}
            </div>
          )}
          {communityAvg > 0 && (
            <div className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-full text-sm font-medium">
              <FiStar size={14} />
              {communityAvg.toFixed(1)} community avg
              <span className="text-indigo-400/50 ml-0.5">({ourRatings.length})</span>
            </div>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Contact & Links */}
        {(place?.phone || place?.website) && (
          <div className="bg-[var(--bg-card)] rounded-2xl border border-white/[0.06] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Contact</h3>
            {place.phone && (
              <a href={`tel:${place.phone}`} className="flex items-center gap-3 text-zinc-300 hover:text-indigo-400 transition-colors">
                <FiPhone size={16} className="text-zinc-500" />
                <span className="text-sm">{place.phone}</span>
              </a>
            )}
            {place.website && (
              <a href={place.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 text-zinc-300 hover:text-indigo-400 transition-colors">
                <FiGlobe size={16} className="text-zinc-500" />
                <span className="text-sm truncate">{new URL(place.website).hostname}</span>
                <FiExternalLink size={12} className="text-zinc-600 flex-shrink-0" />
              </a>
            )}
          </div>
        )}

        {/* Hours */}
        {place && place.hours.length > 0 && (
          <div className="bg-[var(--bg-card)] rounded-2xl border border-white/[0.06] p-5">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FiClock size={14} />
              Hours
            </h3>
            <div className="space-y-1.5">
              {place.hours.map((line, i) => {
                const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
                const isToday = line.toLowerCase().startsWith(today.toLowerCase());
                return (
                  <div key={i} className={`text-xs ${isToday ? "text-indigo-400 font-semibold" : "text-zinc-500"}`}>
                    {line}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mini map */}
      {place && place.lat !== 0 && (
        <div ref={mapRef} className="w-full h-48 rounded-2xl border border-white/[0.06] mb-8" />
      )}

      {/* Community posts */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-zinc-100">
          Community Posts
          {posts.length > 0 && <span className="text-zinc-500 font-normal ml-2 text-base">({posts.length})</span>}
        </h2>
        <p className="text-zinc-500 text-sm mt-1">What people are saying about {displayName}</p>
      </div>

      {postsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-72 shimmer rounded-2xl" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 bg-[var(--bg-card)] rounded-2xl border border-white/[0.06]">
          <div className="text-4xl mb-3">📝</div>
          <p>No one has posted about {displayName} yet.</p>
          <p className="text-sm mt-1 text-zinc-600">Be the first to share your experience!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {posts.map((post) => <PostCard key={post.id} post={post} showAuthor />)}
        </div>
      )}
    </div>
  );
}

export default function PlacePage() {
  return <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}><PlaceContent /></Suspense>;
}
