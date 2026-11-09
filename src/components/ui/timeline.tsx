import React, { useEffect, useRef, useState } from "react";
import { useScroll, useTransform, motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface TimelineEntry {
  title: string;
  content: React.ReactNode;
}

export const Timeline = ({
  data,
  className,
}: {
  data: TimelineEntry[];
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      if (ref.current) {
        setHeight(ref.current.getBoundingClientRect().height);
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateHeight) : null;
    if (ro && ref.current) {
      ro.observe(ref.current);
    }
    return () => {
      window.removeEventListener("resize", updateHeight);
      ro?.disconnect();
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 20%", "end 80%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div
      className={cn("w-full bg-transparent font-sans md:px-8", className)}
      ref={containerRef}
    >
      <div ref={ref} className="relative max-w-7xl mx-auto pb-16">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex justify-start pt-10 md:pt-28 md:gap-10"
          >
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-36 self-start max-w-xs lg:max-w-sm md:w-full">
              <div className="h-9 absolute left-3 md:left-3 w-9 rounded-full bg-white dark:bg-neutral-950 flex items-center justify-center border-2 border-[#0047AB] shadow-xs">
                <div className="h-3 w-3 rounded-full bg-[#0047AB]" />
              </div>
              <h3 className="hidden md:block text-xl md:pl-16 md:text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100 uppercase tracking-tight">
                {item.title}
              </h3>
            </div>

            <div className="relative pl-16 pr-4 md:pl-4 w-full">
              <h3 className="md:hidden block text-xl mb-4 text-left font-bold font-mono text-neutral-900 dark:text-neutral-100 uppercase tracking-tight">
                {item.title}
              </h3>
              {item.content}
            </div>
          </div>
        ))}
        {/* Outer static track: flat neutral line */}
        <div
          style={{
            height: height + "px",
          }}
          className="absolute md:left-7 left-7 top-0 overflow-hidden w-[2px] bg-neutral-200 dark:bg-neutral-800 [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
        >
          {/* Inner animated beam: flat cobalt */}
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0 w-[2px] bg-[#0047AB] rounded-full"
          />
        </div>
      </div>
    </div>
  );
};

