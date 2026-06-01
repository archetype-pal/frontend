import * as React from 'react';

interface ToolbarProps {
  children?: React.ReactNode;
  orientation?: 'vertical' | 'horizontal';
}

export function Toolbar({ children, orientation = 'vertical' }: ToolbarProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div className="absolute z-20 pointer-events-none top-3 left-3">
      <div
        className={[
          'pointer-events-auto rounded-lg border border-border bg-card/95 p-2 shadow-sm backdrop-blur',
          isHorizontal
            ? 'inline-flex max-w-[calc(100vw-6rem)] flex-row flex-wrap items-center gap-1'
            : 'flex max-h-[calc(100vh-8rem)] w-14 flex-col items-center gap-1 overflow-x-hidden overflow-y-auto',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  );
}
