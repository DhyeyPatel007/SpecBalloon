import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';

interface HeroHeadlineProps {
  words?: string;
  className?: string;
}

export const HeroHeadline: React.FC<HeroHeadlineProps> = ({
  words = 'Precision First Article Inspection. Built for the speed of thought.',
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const wordsArray = words.split(' ');

  return (
    <h1
      style={{
        fontSize: 'clamp(2rem, 5.2vw, 4.25rem)',
        lineHeight: 1.06,
        wordBreak: 'normal',
        overflowWrap: 'normal',
        hyphens: 'none',
      }}
      className={cn(
        'font-display font-medium tracking-[-0.035em] text-neutral-950 dark:text-white mb-6 select-none max-w-4xl mx-auto text-balance',
        className
      )}
    >
      {wordsArray.map((word, idx) => (
        <motion.span
          key={`${word}-${idx}`}
          initial={{
            opacity: 0,
            y: shouldReduceMotion ? 0 : 24,
            filter: shouldReduceMotion ? 'none' : 'blur(4px)',
          }}
          animate={{
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
          }}
          transition={{
            duration: 0.45,
            delay: shouldReduceMotion ? 0 : idx * 0.06,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="inline-block whitespace-nowrap mr-[0.28em] last:mr-0 pointer-events-none"
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
};
