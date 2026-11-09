import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

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
        'grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto',
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
        'row-span-1 rounded-xl group/bento hover:shadow-lg transition duration-200 p-5 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 justify-between flex flex-col space-y-4 hover:border-zinc-400 dark:hover:border-zinc-600',
        className
      )}
    >
      {header}
      <div className="group-hover/bento:translate-x-1 transition duration-200">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <div className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            {title}
          </div>
        </div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed">
          {description}
        </div>
      </div>
    </motion.div>
  );
};
