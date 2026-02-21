"use client";

import { useEffect, useState, ReactNode, createContext, useContext } from "react";

const MapsContext = createContext(false);
export const useMapsLoaded = () => useContext(MapsContext);

export default function GoogleMapsLoader({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof google !== "undefined" && google.maps) { setLoaded(true); return; }
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) { existing.addEventListener("load", () => setLoaded(true)); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => console.warn("Google Maps failed to load");
    document.head.appendChild(script);
  }, []);

  return <MapsContext.Provider value={loaded}>{children}</MapsContext.Provider>;
}
