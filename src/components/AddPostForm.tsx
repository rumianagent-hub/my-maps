"use client";

import { useState, useRef, useEffect } from "react";
import { FiCamera, FiStar, FiX, FiUploadCloud, FiCheck, FiImage } from "react-icons/fi";
import { collection, addDoc, doc, setDoc, increment } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import PlaceSearch from "./PlaceSearch";
import { compressImage } from "@/lib/imageUtils";
import { v4 as uuid } from "uuid";
import { useRouter } from "next/navigation";

interface SelectedPlace {
  placeId: string; name: string; address: string; lat: number; lng: number; city: string; country: string; types: string[];
}

// Auto-generate tags based on place types from Google
function generateAutoTags(place: SelectedPlace): string[] {
  const typeMap: Record<string, string> = {
    restaurant: "restaurant",
    food: "food",
    cafe: "cafe",
    bar: "bar",
    bakery: "bakery",
    meal_delivery: "delivery",
    meal_takeaway: "takeaway",
    night_club: "nightlife",
    lodging: "hotel-dining",
  };

  const tags: string[] = [];
  if (place.types) {
    for (const t of place.types) {
      if (typeMap[t] && !tags.includes(typeMap[t])) tags.push(typeMap[t]);
    }
  }
  if (place.city) tags.push(place.city.toLowerCase());
  return tags.slice(0, 5);
}

// Suggested tags for quick add
const SUGGESTED_TAGS = [
  "🍕 pizza", "🍣 sushi", "🍔 burgers", "🌮 tacos", "🍜 noodles", "🥗 healthy",
  "☕ brunch", "🍷 wine", "🍺 beer", "🥂 date-night", "👨‍👩‍👧 family", "💰 budget",
  "✨ fine-dining", "🔥 must-try", "🌱 vegan", "🍝 pasta", "🥘 curry", "🍰 dessert",
];

export default function AddPostForm() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: photo, 2: restaurant, 3: details
  const [place, setPlace] = useState<SelectedPlace | null>(null);
  const [caption, setCaption] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Auto-add tags when place is selected
  useEffect(() => {
    if (place) {
      const autoTags = generateAutoTags(place);
      setTags((prev) => {
        const combined = [...prev];
        autoTags.forEach((t) => { if (!combined.includes(t)) combined.push(t); });
        return combined.slice(0, 8);
      });
    }
  }, [place]);

  const handlePhotos = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - photos.length);
    setPhotos((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => setPreviews((prev) => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
    if (photos.length === 0 && newFiles.length > 0) {
      // Auto advance to step 2 after first photo
      setTimeout(() => setStep(2), 300);
    }
  };

  const removePhoto = (i: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const toggleTag = (tag: string) => {
    const clean = tag.replace(/^[^\w]+ /, ""); // remove emoji prefix
    if (tags.includes(clean)) {
      setTags(tags.filter((t) => t !== clean));
    } else if (tags.length < 8) {
      setTags([...tags, clean]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handlePhotos(e.dataTransfer.files);
  };

  const uploadPhoto = async (file: File, index: number, total: number): Promise<string> => {
    const compressed = await compressImage(file);
    const id = uuid();
    const storageRef = ref(storage, `users/${user!.uid}/posts/${id}.jpg`);
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, compressed, { contentType: "image/jpeg" });
      task.on("state_changed",
        (snap) => {
          const fileProgress = (snap.bytesTransferred / snap.totalBytes) * 100;
          setUploadProgress(Math.round(((index * 100) + fileProgress) / total));
        },
        reject,
        async () => { resolve(await getDownloadURL(task.snapshot.ref)); }
      );
    });
  };

  const handleSubmit = async () => {
    if (!user || !place || !profile || photos.length === 0) return;
    setSubmitting(true);
    setUploadProgress(0);
    try {
      const photoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const url = await uploadPhoto(photos[i], i, photos.length);
        photoUrls.push(url);
      }

      await addDoc(collection(db, "posts"), {
        uid: user.uid,
        placeId: place.placeId,
        placeName: place.name,
        placeAddress: place.address,
        lat: place.lat,
        lng: place.lng,
        city: place.city,
        caption, rating, tags,
        visitedAt: Date.now(),
        createdAt: Date.now(),
        photoUrls,
        visibility: "public",
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        authorUsername: profile.username,
      });

      await setDoc(doc(db, "users", user.uid), { postCount: increment(1) }, { merge: true });
      router.push("/profile");
    } catch (err) {
      console.error("Failed to create post:", err);
      alert("Failed to create post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const canPublish = place && photos.length > 0 && !submitting;

  // Step indicator
  const steps = [
    { num: 1, label: "Photo" },
    { num: 2, label: "Restaurant" },
    { num: 3, label: "Details" },
  ];

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => {
                if (s.num === 1 || (s.num === 2 && photos.length > 0) || (s.num === 3 && photos.length > 0 && place))
                  setStep(s.num);
              }}
              className={`flex items-center gap-2 text-sm font-medium transition-all ${
                step === s.num ? "text-indigo-400" :
                step > s.num ? "text-emerald-400" : "text-zinc-600"
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s.num ? "bg-indigo-500/20 text-indigo-400 ring-2 ring-indigo-500/30" :
                step > s.num ? "bg-emerald-500/20 text-emerald-400" : "bg-white/[0.04] text-zinc-600"
              }`}>
                {step > s.num ? <FiCheck size={14} /> : s.num}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px transition-colors ${step > s.num ? "bg-emerald-500/30" : "bg-white/[0.04]"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Photos */}
      {step === 1 && (
        <div className="animate-fade-in">
          <h2 className="text-xl font-bold text-zinc-100 mb-1">📸 Show us the food!</h2>
          <p className="text-zinc-500 text-sm mb-6">Add at least one photo to share your experience</p>

          {previews.length === 0 ? (
            <div
              ref={dragRef}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative h-64 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                dragOver ? "border-indigo-400 bg-indigo-500/10" : "border-white/[0.08] bg-white/[0.02] hover:border-indigo-500/30 hover:bg-indigo-500/5"
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
                <FiImage size={28} className="text-indigo-400" />
              </div>
              <p className="text-zinc-300 font-medium">Tap to add photos</p>
              <p className="text-zinc-600 text-sm mt-1">or drag & drop • up to 5 photos</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden ring-1 ring-white/[0.06] group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removePhoto(i)}
                      className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <FiX size={14} />
                    </button>
                    {i === 0 && (
                      <div className="absolute bottom-2 left-2 bg-indigo-500/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        COVER
                      </div>
                    )}
                  </div>
                ))}
                {photos.length < 5 && (
                  <button onClick={() => fileRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-white/[0.08] flex flex-col items-center justify-center text-zinc-600 hover:border-indigo-500/30 hover:text-indigo-400 transition-all">
                    <FiCamera size={22} />
                    <span className="text-[10px] mt-1 font-medium">Add more</span>
                  </button>
                )}
              </div>
              <button onClick={() => setStep(2)}
                className="w-full mt-6 py-3.5 btn-primary text-sm">
                Continue →
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotos(e.target.files)} />
        </div>
      )}

      {/* Step 2: Restaurant */}
      {step === 2 && (
        <div className="animate-fade-in">
          <h2 className="text-xl font-bold text-zinc-100 mb-1">📍 Where did you eat?</h2>
          <p className="text-zinc-500 text-sm mb-6">Search for the restaurant</p>

          <PlaceSearch onSelect={(p) => { setPlace(p); setTimeout(() => setStep(3), 400); }} />

          {place && (
            <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-3 animate-fade-in">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                <FiCheck size={18} className="text-indigo-400" />
              </div>
              <div>
                <div className="font-semibold text-zinc-100 text-sm">{place.name}</div>
                <div className="text-zinc-500 text-xs">{place.city || place.address}</div>
              </div>
              <button onClick={() => setPlace(null)} className="ml-auto p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors">
                <FiX size={14} className="text-zinc-500" />
              </button>
            </div>
          )}

          {place && (
            <button onClick={() => setStep(3)}
              className="w-full mt-6 py-3.5 btn-primary text-sm">
              Continue →
            </button>
          )}
        </div>
      )}

      {/* Step 3: Details */}
      {step === 3 && (
        <div className="animate-fade-in space-y-6">
          {/* Preview card */}
          {previews[0] && place && (
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.06]">
              <img src={previews[0]} alt="" className="w-full h-40 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3">
                <div className="font-semibold text-white text-sm">{place.name}</div>
                <div className="text-white/60 text-xs">{place.city}</div>
              </div>
              <div className="absolute bottom-3 right-3 text-xs text-white/40">
                {photos.length} photo{photos.length > 1 ? "s" : ""}
              </div>
            </div>
          )}

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">How was it?</label>
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
            {rating > 0 && (
              <div className="text-center text-sm text-zinc-500 mt-1">
                {["", "Not great", "It was okay", "Pretty good!", "Really great!", "Absolutely amazing!"][rating]}
              </div>
            )}
          </div>

          {/* What people should know */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">What should people know? 💭</label>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
              placeholder="The pasta was incredible, get the truffle ravioli! Ask for a window seat..."
              rows={3}
              className="w-full px-4 py-3.5 bg-[var(--bg-secondary)] border border-white/[0.06] rounded-xl text-zinc-100 placeholder:text-zinc-600 resize-none text-sm leading-relaxed" />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Tags</label>
            {/* Auto tags */}
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
            {/* Suggested tags */}
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_TAGS.filter((t) => !tags.includes(t.replace(/^[^\w]+ /, ""))).slice(0, 12).map((t) => (
                <button key={t} onClick={() => toggleTag(t)}
                  className="px-3 py-1.5 bg-white/[0.03] text-zinc-500 rounded-full text-xs border border-white/[0.04] hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/10 transition-all">
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Upload progress */}
          {submitting && uploadProgress > 0 && (
            <div className="space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <FiUploadCloud size={16} className="text-indigo-400 animate-pulse" />
                Publishing your post... {uploadProgress}%
              </div>
              <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Publish button */}
          <button onClick={handleSubmit} disabled={!canPublish}
            className="w-full py-4 btn-primary text-base font-semibold disabled:opacity-40">
            {submitting ? "Publishing..." : "Share with the world 🌍"}
          </button>
        </div>
      )}
    </div>
  );
}
