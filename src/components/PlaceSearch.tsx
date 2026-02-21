"use client";

import { useState, useRef, useEffect } from "react";
import { FiSearch, FiMapPin } from "react-icons/fi";
import { useMapsLoaded } from "./GoogleMapsLoader";

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  types: string[];
}

export default function PlaceSearch({ onSelect }: { onSelect: (place: PlaceResult) => void }) {
  const mapsLoaded = useMapsLoaded();
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    if (mapsLoaded && typeof google !== "undefined") {
      autocompleteRef.current = new google.maps.places.AutocompleteService();
      placesRef.current = new google.maps.places.PlacesService(document.createElement("div"));
    }
  }, [mapsLoaded]);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.length < 2) { setPredictions([]); setIsOpen(false); return; }
    autocompleteRef.current?.getPlacePredictions(
      { input: value, types: ["establishment"] },
      (results) => { setPredictions(results || []); setIsOpen(true); }
    );
  };

  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    placesRef.current?.getDetails(
      { placeId: prediction.place_id, fields: ["name", "formatted_address", "geometry", "address_components", "types"] },
      (place) => {
        if (!place?.geometry?.location) return;
        let city = "", country = "";
        place.address_components?.forEach((c) => {
          if (c.types.includes("locality")) city = c.long_name;
          if (c.types.includes("country")) country = c.long_name;
        });
        onSelect({
          placeId: prediction.place_id,
          name: place.name || prediction.structured_formatting.main_text,
          address: place.formatted_address || prediction.description,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          city, country,
          types: place.types || [],
        });
        setQuery(place.name || "");
        setIsOpen(false);
      }
    );
  };

  return (
    <div className="relative">
      <div className="relative">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="text" value={query} onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => predictions.length > 0 && setIsOpen(true)}
          placeholder="Search for a restaurant..."
          className="w-full pl-11 pr-4 py-3.5 bg-[var(--bg-secondary)] border border-white/[0.06] rounded-xl text-zinc-100 placeholder:text-zinc-600 text-sm"
        />
      </div>
      {isOpen && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[var(--bg-card)] rounded-xl shadow-2xl border border-white/[0.08] overflow-hidden z-50 max-h-64 overflow-y-auto">
          {predictions.map((p) => (
            <button key={p.place_id} onClick={() => handleSelect(p)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] text-left transition-colors">
              <FiMapPin className="text-indigo-400 mt-0.5 shrink-0" size={16} />
              <div>
                <div className="font-medium text-zinc-100 text-sm">{p.structured_formatting.main_text}</div>
                <div className="text-zinc-500 text-xs">{p.structured_formatting.secondary_text}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
