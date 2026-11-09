import React, { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export interface Tab {
  id: string;
  label: string | React.ReactNode;
  badge?: string | number;
  content?: React.ReactNode;
}

export const AnimatedTabs = ({
  tabs,
  activeTab,
  onChange,
  className,
  tabClassName,
  activeTabClassName,
  indicatorClassName,
  layoutId = 'animated-tab-indicator',
}: {
  tabs: Tab[];
  activeTab?: string;
  onChange?: (id: string) => void;
  className?: string;
  tabClassName?: string;
  activeTabClassName?: string;
  indicatorClassName?: string;
  layoutId?: string;
}) => {
  const [internalActive, setInternalActive] = useState<string>(tabs[0]?.id || '');
  const currentTab = activeTab !== undefined ? activeTab : internalActive;

  const handleSelect = (id: string) => {
    if (activeTab === undefined) {
      setInternalActive(id);
    }
    onChange?.(id);
  };

  return (
    <div className={cn('flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === currentTab;
        return (
          <button
            key={tab.id}
            onClick={() => handleSelect(tab.id)}
            className={cn(
              'relative px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors z-10 flex items-center gap-1.5 focus:outline-none',
              isActive
                ? cn('text-zinc-900 dark:text-zinc-100', activeTabClassName)
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200',
              tabClassName
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                className={cn(
                  'absolute inset-0 bg-white dark:bg-[#1E1E24] rounded-md shadow-sm border border-zinc-200 dark:border-zinc-700/60 -z-10',
                  indicatorClassName
                )}
              />
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded font-mono',
                  isActive
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold'
                    : 'bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-500'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

