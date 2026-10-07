import React, { useEffect, useState, useRef } from 'react';

/**
 * Premium Subtle Desktop Secondary Cursor Ring
 * - Non-intrusive: system cursor arrow remains 100% visible and standard
 * - Follows smoothly with lerp physics in requestAnimationFrame
 * - Expands subtly when hovering over buttons, links, cards, and interactive elements
 * - Completely disabled on mobile/touch screens and when prefers-reduced-motion is active
 * - Pointer-events: none ensures zero interference with clicking, typing, or scrolling
 */
export default function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    // Only enable on desktop devices with fine pointer (mouse)
    if (typeof window === 'undefined') return;
    const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isFinePointer || prefersReducedMotion) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);

      // Check if hovering clickable/interactive element
      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = !!target.closest(
          'button, a, input, textarea, select, [role="button"], .interactive-card, .mouse-hover-card, .cursor-pointer, [data-interactive="true"]'
        );
        setIsInteractive(interactive);
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // Smooth physics loop for the secondary ring
    const render = () => {
      // Lerp ring towards mouse position (0.2 factor gives a snappy yet fluid trail)
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.22;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.22;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) translate(-50%, -50%)`;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0) translate(-50%, -50%)`;
      }

      rafId.current = requestAnimationFrame(render);
    };

    rafId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden hidden md:block select-none" aria-hidden="true">
      {/* Precision inner center dot */}
      <div
        ref={dotRef}
        className={`fixed top-0 left-0 w-1.5 h-1.5 rounded-full bg-blue-400 transition-opacity duration-200 ${
          isInteractive ? 'opacity-90 scale-125' : 'opacity-40'
        }`}
        style={{ willChange: 'transform' }}
      />

      {/* Smooth secondary glowing trailing ring */}
      <div
        ref={ringRef}
        className={`fixed top-0 left-0 rounded-full transition-all duration-200 ease-out border ${
          isInteractive
            ? 'w-11 h-11 border-blue-400/70 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.35)]'
            : isClicking
            ? 'w-7 h-7 border-blue-400/80 bg-blue-500/20'
            : 'w-8 h-8 border-slate-500/30 bg-white/[0.02]'
        }`}
        style={{ willChange: 'transform' }}
      />
    </div>
  );
}
