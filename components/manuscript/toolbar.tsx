import * as React from 'react';

interface ToolbarProps {
  children?: React.ReactNode;
  orientation?: 'vertical' | 'horizontal';
}

export function Toolbar({ children, orientation = 'vertical' }: ToolbarProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={[
        'absolute z-20 pointer-events-none',
        isHorizontal ? 'top-3 left-3' : 'top-3 left-3',
      ].join(' ')}
    >
      <div
        className={[
          'pointer-events-auto rounded-lg border bg-white/95 p-2 shadow-sm backdrop-blur',
          isHorizontal
            ? 'inline-flex max-w-[calc(100vw-6rem)] flex-row flex-wrap items-center gap-1'
            : 'flex w-12 flex-col items-center gap-1',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  );
}
