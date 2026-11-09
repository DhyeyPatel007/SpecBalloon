import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        'grid md:auto-rows-[19rem] grid-cols-1 md:grid-cols-3 gap-5 max-w-7xl mx-auto',
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn(
        'row-span-1 rounded-xl group/bento transition duration-200 p-6 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 justify-between flex flex-col space-y-4 hover:border-[#0047AB] dark:hover:border-[#0047AB] shadow-xs',
        className
      )}
    >
      {header}
      <div className="group-hover/bento:translate-x-1 transition duration-200">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <div className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
            {title}
          </div>
        </div>
        <div className="text-xs text-neutral-600 dark:text-neutral-400 font-sans leading-relaxed">
          {description}
        </div>
      </div>
    </motion.div>
  );
};
