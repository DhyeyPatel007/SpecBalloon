import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

export const InfiniteMovingCards = ({
  items,
  direction = 'left',
  speed = 'fast',
  pauseOnHover = true,
  className,
}: {
  items: {
    quote?: string;
    name: string;
    title: string;
    metric?: string;
    badge?: string;
  }[];
  direction?: 'left' | 'right';
  speed?: 'fast' | 'normal' | 'slow';
  pauseOnHover?: boolean;
  className?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLUListElement>(null);

  const [start, setStart] = useState(false);

  useEffect(() => {
    addAnimation();
  }, []);

  function addAnimation() {
    if (containerRef.current && scrollerRef.current) {
      // React StrictMode Guard: prevent duplicate cloning on double-mount
      if (scrollerRef.current.dataset.cloned === "true") return;
      scrollerRef.current.dataset.cloned = "true";

      const scrollerContent = Array.from(scrollerRef.current.children);

      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        if (scrollerRef.current) {
          scrollerRef.current.appendChild(duplicatedItem);
        }
      });

      getDirection();
      getSpeed();
      setStart(true);
    }
  }

  const getDirection = () => {
    if (containerRef.current) {
      if (direction === 'left') {
        containerRef.current.style.setProperty('--animation-direction', 'forwards');
      } else {
        containerRef.current.style.setProperty('--animation-direction', 'reverse');
      }
    }
  };

  const getSpeed = () => {
    if (containerRef.current) {
      if (speed === 'fast') {
        containerRef.current.style.setProperty('--animation-duration', '20s');
      } else if (speed === 'normal') {
        containerRef.current.style.setProperty('--animation-duration', '45s');
      } else {
        containerRef.current.style.setProperty('--animation-duration', '80s');
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_15%,white_85%,transparent)]',
        className
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          'flex min-w-full shrink-0 gap-4 py-3 w-max flex-nowrap',
          start && 'animate-scroll',
          pauseOnHover && 'hover:[animation-play-state:paused]'
        )}
      >
        {items.map((item, idx) => (
          <li
            className="w-[320px] max-w-full relative rounded-xl border border-[#0047AB]/25 flex-shrink-0 px-5 py-4 md:w-[380px] bg-white dark:bg-neutral-950 transition-colors shadow-xs"
            key={`${item.name}-${idx}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                {item.name}
              </span>
              {item.badge && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#0047AB]/30 bg-[#0047AB]/10 text-[#0047AB] dark:text-[#38BDF8] font-bold">
                  {item.badge}
                </span>
              )}
            </div>
            {item.quote && (
              <p className="text-xs text-neutral-600 dark:text-neutral-400 font-sans leading-relaxed line-clamp-2">
                "{item.quote}"
              </p>
            )}
            <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-between">
              <span className="text-[11px] font-mono text-neutral-500">{item.title}</span>
              {item.metric && (
                <span className="text-xs font-mono font-bold text-[#0047AB] dark:text-[#38BDF8]">
                  {item.metric}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
