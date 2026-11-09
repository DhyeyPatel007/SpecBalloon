import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface TextRollProps {
  children: string;
  className?: string;
  duration?: number;
  delay?: number;
}

export const TextRoll = ({
  children,
  className,
  duration = 0.25,
  delay = 0.015,
}: TextRollProps) => {
  const letters = children.split('');

  return (
    <span
      className={cn(
        'inline-flex flex-wrap overflow-hidden relative cursor-default select-none group',
        className
      )}
    >
      <span className="sr-only">{children}</span>
      {letters.map((char, i) => (
        <span
          key={i}
          className="inline-block relative overflow-hidden h-[1.15em] leading-[1.15em]"
          aria-hidden="true"
        >
          <motion.span
            className="inline-block"
            initial={{ y: '0%' }}
            whileHover={{ y: '-100%' }}
            transition={{
              duration,
              delay: i * delay,
              ease: [0.33, 1, 0.68, 1],
            }}
          >
            <span className="block">{char === ' ' ? '\u00A0' : char}</span>
            <span className="block text-sky-600 dark:text-sky-400">
              {char === ' ' ? '\u00A0' : char}
            </span>
          </motion.span>
        </span>
      ))}
    </span>
  );
};
