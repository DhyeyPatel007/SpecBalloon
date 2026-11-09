import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export interface QueueItem {
  id: string | number;
  [key: string]: any;
}

export const AnimatedQueueList = <T extends QueueItem>({
  items,
  renderItem,
  className,
  itemClassName,
  emptyMessage = 'No items in queue',
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  itemClassName?: string;
  emptyMessage?: React.ReactNode;
}) => {
  return (
    <div className={cn('relative w-full', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-8 text-center text-xs font-mono text-zinc-500"
          >
            {emptyMessage}
          </motion.div>
        ) : (
          items.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -16, scale: 0.96 }}
              transition={{
                layout: { type: 'spring', bounce: 0.15, duration: 0.3 },
                opacity: { duration: 0.2 },
              }}
              className={cn('relative', itemClassName)}
            >
              {renderItem(item, index)}
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
};

