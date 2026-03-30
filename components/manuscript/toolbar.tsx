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
        'fixed z-50 border bg-white p-2',
        isHorizontal
          ? 'top-68 left-1/5 flex -translate-x-1/2 flex-row items-center gap-1'
          : 'top-96 flex w-12 flex-col items-center gap-1',
      ].join(' ')}
    >
      {children}
    </div>
  );
}
