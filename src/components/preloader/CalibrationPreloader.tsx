import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { SpecBalloonLogo } from '../brand/SpecBalloonLogo';

interface CalibrationPreloaderProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export const CalibrationPreloader: React.FC<CalibrationPreloaderProps> = ({
  onComplete,
  forceShow = false
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (forceShow) return true;
    const hasSeen = sessionStorage.getItem('specballoon_preloaded_v25');
    return !hasSeen;
  });

  const [vernierDisplay, setVernierDisplay] = useState('00.000 mm');
  const [statusText, setStatusText] = useState('ALIGNING VERNIER OPTICAL BENCH...');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const leftJawRef = useRef<HTMLDivElement>(null);
  const rightJawRef = useRef<HTMLDivElement>(null);
  const centerContentRef = useRef<HTMLDivElement>(null);
  const logoWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) {
      if (onComplete) onComplete();
      return;
    }

    const vernierTarget = { val: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        sessionStorage.setItem('specballoon_preloaded_v25', 'true');
        setIsVisible(false);
        if (onComplete) onComplete();
      }
    });

    // 1. Vernier tick animation (0.000 -> 30.021 mm)
    tl.to(vernierTarget, {
      val: 30.021,
      duration: 0.95,
      ease: 'power3.inOut',
      onUpdate: () => {
        setVernierDisplay(`${vernierTarget.val.toFixed(3).padStart(6, '0')} mm`);
      }
    });

    // 2. Rotate logo 90 degrees into mechanical lock
    if (logoWrapperRef.current) {
      tl.to(
        logoWrapperRef.current,
        {
          rotate: 90,
          duration: 0.8,
          ease: 'back.out(1.8)'
        },
        0.1
      );
    }

    // 3. Update status text
    tl.call(() => {
      setStatusText('INITIALIZING PYMUPDF VECTOR ENGINE // GEMINI 2.5 VISION // ISO-286 SOLVER');
    }, undefined, 0.45);

    tl.call(() => {
      setVernierDisplay('30.021 mm [LOCKED]');
      setStatusText('SYSTEMS CALIBRATED · 300 DPI VECTOR ACTIVE');
    }, undefined, 0.95);

    // 4. Fade out center content slightly before jaws open
    if (centerContentRef.current) {
      tl.to(
        centerContentRef.current,
        {
          opacity: 0,
          scale: 0.95,
          duration: 0.25,
          ease: 'power2.in'
        },
        1.1
      );
    }

    // 5. Mechanical Caliper Jaws Split Vertically (Left jaw to left -100%, Right jaw to right 100%)
    if (leftJawRef.current && rightJawRef.current) {
      tl.to(
        leftJawRef.current,
        {
          xPercent: -100,
          duration: 0.55,
          ease: 'expo.inOut'
        },
        1.2
      );

      tl.to(
        rightJawRef.current,
        {
          xPercent: 100,
          duration: 0.55,
          ease: 'expo.inOut'
        },
        1.2
      );
    }

    return () => {
      tl.kill();
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 pointer-events-none select-none flex overflow-hidden font-sans"
    >
      {/* Left Caliper Jaw Panel */}
      <div
        ref={leftJawRef}
        className="w-1/2 h-full bg-[#09090B] relative border-r border-[#27272A] pointer-events-auto flex items-center justify-end"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      >
        {/* Architectural Tick Rulers along Jaw Edge */}
        <div className="absolute right-0 top-0 bottom-0 w-4 flex flex-col justify-between py-6 opacity-30">
          {Array.from({ length: 25 }).map((_, i) => (
            <div
              key={i}
              className={`h-px bg-white ml-auto ${i % 5 === 0 ? 'w-3 opacity-90' : 'w-1.5 opacity-40'}`}
            />
          ))}
        </div>
      </div>

      {/* Right Caliper Jaw Panel */}
      <div
        ref={rightJawRef}
        className="w-1/2 h-full bg-[#09090B] relative border-l border-[#27272A] pointer-events-auto flex items-center justify-start"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      >
        {/* Architectural Tick Rulers along Jaw Edge */}
        <div className="absolute left-0 top-0 bottom-0 w-4 flex flex-col justify-between py-6 opacity-30">
          {Array.from({ length: 25 }).map((_, i) => (
            <div
              key={i}
              className={`h-px bg-white ${i % 5 === 0 ? 'w-3 opacity-90' : 'w-1.5 opacity-40'}`}
            />
          ))}
        </div>
      </div>

      {/* Center Floating Instrumentation Overlay */}
      <div
        ref={centerContentRef}
        className="absolute inset-0 flex flex-col items-center justify-center z-10 text-white pointer-events-none"
      >
        {/* Rotating Precision Logo */}
        <div
          ref={logoWrapperRef}
          className="w-16 h-16 flex items-center justify-center text-white mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]"
        >
          <SpecBalloonLogo size={52} animateRuby={true} />
        </div>

        {/* Vernier Ticker */}
        <div className="px-4 py-1.5 rounded border border-[#27272A] bg-[#121215]/80 backdrop-blur-sm mb-3">
          <div className="font-mono text-lg font-bold tracking-widest text-[#FAFAFA] tabular-nums">
            {vernierDisplay}
          </div>
        </div>

        {/* Dynamic Micro-Vernier Graduation Bar */}
        <div className="w-56 h-3 flex items-end justify-between px-1 mb-4 opacity-70">
          {Array.from({ length: 21 }).map((_, idx) => (
            <div
              key={idx}
              className={`w-px bg-white transition-all duration-150 ${
                idx === 10
                  ? 'h-3 bg-[#E11D48]'
                  : idx % 5 === 0
                  ? 'h-2 bg-white'
                  : 'h-1 bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* Bottom Telemetry Ticker */}
        <div className="font-mono text-[10px] text-[#A1A1AA] tracking-wider uppercase text-center max-w-md px-4">
          {statusText}
        </div>
      </div>
    </div>
  );
};

