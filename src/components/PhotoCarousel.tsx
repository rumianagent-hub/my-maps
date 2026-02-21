"use client";

import { useState, useRef, useCallback } from "react";

interface PhotoCarouselProps {
  photos: string[];
  alt?: string;
  aspectRatio?: string;
  className?: string;
  overlay?: React.ReactNode;
}

export default function PhotoCarousel({ photos, alt = "", aspectRatio = "aspect-[4/3]", className = "", overlay }: PhotoCarouselProps) {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const goTo = useCallback((index: number) => {
    setCurrent(Math.max(0, Math.min(photos.length - 1, index)));
  }, [photos.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    // Only swipe horizontally if more horizontal than vertical
    if (Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault();
      setDragOffset(dx);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart.current) return;
    const velocity = Math.abs(dragOffset) / (Date.now() - touchStart.current.time);
    const threshold = velocity > 0.3 ? 30 : 80; // fast swipe = lower threshold
    if (dragOffset < -threshold && current < photos.length - 1) {
      goTo(current + 1);
    } else if (dragOffset > threshold && current > 0) {
      goTo(current - 1);
    }
    touchStart.current = null;
    setDragOffset(0);
    setIsDragging(false);
  };

  // Mouse drag support for desktop
  const mouseStart = useRef<{ x: number; time: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (photos.length <= 1) return;
    mouseStart.current = { x: e.clientX, time: Date.now() };
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseStart.current || !isDragging) return;
    setDragOffset(e.clientX - mouseStart.current.x);
  };

  const handleMouseUp = () => {
    if (!mouseStart.current) return;
    const velocity = Math.abs(dragOffset) / (Date.now() - mouseStart.current.time);
    const threshold = velocity > 0.3 ? 30 : 80;
    if (dragOffset < -threshold && current < photos.length - 1) {
      goTo(current + 1);
    } else if (dragOffset > threshold && current > 0) {
      goTo(current - 1);
    }
    mouseStart.current = null;
    setDragOffset(0);
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    if (mouseStart.current) {
      mouseStart.current = null;
      setDragOffset(0);
      setIsDragging(false);
    }
  };

  if (photos.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none ${aspectRatio} ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: photos.length > 1 ? "grab" : undefined }}
    >
      {/* Sliding track */}
      <div
        className={`flex h-full ${isDragging ? "" : "transition-transform duration-300 ease-out"}`}
        style={{ transform: `translateX(calc(-${current * 100}% + ${dragOffset}px))` }}
      >
        {photos.map((url, i) => (
          <div key={i} className="w-full h-full flex-shrink-0">
            <img
              src={url}
              alt={alt}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Overlay content (author badge etc) */}
      {overlay}

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); goTo(i); }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? "bg-white w-5" : "bg-white/40 w-2"
              }`}
            />
          ))}
        </div>
      )}

      {/* Photo counter */}
      {photos.length > 1 && (
        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium text-white/80 border border-white/10">
          {current + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}
