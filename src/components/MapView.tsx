"use client";

import { useEffect, useRef, useState } from "react";
import { Post } from "@/lib/types";
import { useMapsLoaded } from "./GoogleMapsLoader";

interface MapViewProps {
  posts: Post[];
  onMarkerClick?: (post: Post) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0c0c14" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0c0c14" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#555566" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a1a24" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#111119" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#050508" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1a1a24" }] },
];

function createPhotoOverlay(
  map: google.maps.Map,
  post: Post,
  onClick: () => void
) {
  const overlay = new google.maps.OverlayView();
  const position = new google.maps.LatLng(post.lat, post.lng);
  let div: HTMLDivElement | null = null;

  overlay.onAdd = function () {
    div = document.createElement("div");
    div.style.cssText = "position:absolute;cursor:pointer;transition:transform 0.2s ease;z-index:1;";
    div.onmouseenter = () => { if (div) { div.style.transform = "scale(1.15) translateY(-4px)"; div.style.zIndex = "10"; } };
    div.onmouseleave = () => { if (div) { div.style.transform = "scale(1)"; div.style.zIndex = "1"; } };
    div.onclick = (e) => { e.stopPropagation(); onClick(); };

    const hasPhoto = post.photoUrls.length > 0;

    if (hasPhoto) {
      div.innerHTML = `
        <div style="filter:drop-shadow(0 3px 8px rgba(0,0,0,0.6));">
          <div style="width:50px;height:50px;border-radius:10px;overflow:hidden;border:3px solid #6366f1;">
            <img src="${post.photoUrls[0]}" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy" />
          </div>
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid #6366f1;margin:-1px auto 0;"></div>
        </div>
      `;
    } else {
      div.innerHTML = `
        <div style="filter:drop-shadow(0 3px 8px rgba(0,0,0,0.6));">
          <div style="width:50px;height:50px;border-radius:10px;background:#111119;border:3px solid #6366f1;display:flex;align-items:center;justify-content:center;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid #6366f1;margin:-1px auto 0;"></div>
        </div>
      `;
    }

    const panes = this.getPanes();
    panes?.overlayMouseTarget.appendChild(div);
  };

  overlay.draw = function () {
    if (!div) return;
    const projection = this.getProjection();
    if (!projection) return;
    const pos = projection.fromLatLngToDivPixel(position);
    if (pos) {
      div.style.left = (pos.x - 25) + "px";
      div.style.top = (pos.y - 58) + "px";
    }
  };

  overlay.onRemove = function () {
    if (div) {
      div.parentNode?.removeChild(div);
      div = null;
    }
  };

  overlay.setMap(map);
  return overlay;
}

function createInfoCard(post: Post): HTMLElement {
  const card = document.createElement("div");
  card.style.cssText = "font-family:Inter,system-ui,sans-serif;width:260px;background:#111119;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);box-shadow:0 12px 40px rgba(0,0,0,0.6);cursor:pointer;transition:transform 0.15s ease;";
  card.onmouseenter = () => { card.style.transform = "scale(1.02)"; };
  card.onmouseleave = () => { card.style.transform = "scale(1)"; };

  const photo = post.photoUrls.length > 0
    ? `<div style="position:relative;"><img src="${post.photoUrls[0]}" style="width:100%;height:140px;object-fit:cover;display:block;" /><div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(17,17,25,0.8),transparent 60%);"></div></div>`
    : "";

  const rating = post.rating > 0
    ? `<div style="display:inline-flex;align-items:center;gap:3px;background:rgba(245,158,11,0.12);color:#f59e0b;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;margin-top:6px;">★ ${post.rating}/5</div>`
    : "";

  const caption = post.caption
    ? `<div style="font-size:12px;color:#888;margin-top:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4;">${post.caption}</div>`
    : "";

  card.innerHTML = `
    ${photo}
    <div style="padding:12px 14px 14px;">
      <div style="font-weight:600;font-size:15px;color:#f5f5f7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${post.placeName}</div>
      <div style="font-size:12px;color:#666;margin-top:2px;display:flex;align-items:center;gap:4px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${post.city || post.placeAddress}</span>
      </div>
      ${rating}
      ${caption}
      <div style="margin-top:10px;text-align:center;">
        <span style="display:inline-block;font-size:12px;font-weight:500;color:#818cf8;background:rgba(99,102,241,0.1);padding:6px 16px;border-radius:8px;border:1px solid rgba(99,102,241,0.15);">View Post →</span>
      </div>
    </div>
  `;

  return card;
}

export default function MapView({ posts, onMarkerClick, center, zoom = 3 }: MapViewProps) {
  const mapsLoaded = useMapsLoaded();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const overlaysRef = useRef<google.maps.OverlayView[]>([]);

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || typeof google === "undefined") return;
    const m = new google.maps.Map(mapRef.current, {
      center: center || { lat: 40, lng: -95 },
      zoom,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
      styles: darkMapStyle,
      backgroundColor: "#0c0c14",
    });
    setMap(m);
  }, [mapsLoaded]);

  useEffect(() => {
    if (!map) return;

    // Clear old overlays
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    if (posts.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    let activeInfoWindow: google.maps.InfoWindow | null = null;

    const mapClickListener = map.addListener("click", () => { activeInfoWindow?.close(); });

    posts.forEach((post) => {
      if (!post.lat || !post.lng) return;

      const position = new google.maps.LatLng(post.lat, post.lng);

      const overlay = createPhotoOverlay(map, post, () => {
        activeInfoWindow?.close();

        const card = createInfoCard(post);
        card.addEventListener("click", () => {
          window.location.href = `/post?id=${post.id}`;
        });

        const iw = new google.maps.InfoWindow({
          content: card,
          position,
          pixelOffset: new google.maps.Size(0, -62),
          maxWidth: 280,
        });
        activeInfoWindow = iw;
        iw.open(map);

        onMarkerClick?.(post);
      });

      overlaysRef.current.push(overlay);
      bounds.extend(position);
    });

    if (posts.length > 1) map.fitBounds(bounds, 50);
    else if (posts.length === 1) { map.setCenter({ lat: posts[0].lat, lng: posts[0].lng }); map.setZoom(14); }

    return () => {
      google.maps.event.removeListener(mapClickListener);
    };
  }, [map, posts, onMarkerClick]);

  if (!mapsLoaded) {
    return (
      <div className="w-full h-full rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center text-zinc-500">
        <div className="text-center"><div className="text-3xl mb-2">🗺️</div><p className="text-sm">Loading map...</p></div>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full rounded-2xl overflow-hidden" />;
}
