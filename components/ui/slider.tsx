'use client';

import * as React from 'react';
import * as RadixSlider from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

export const Slider = React.forwardRef<
  React.ElementRef<typeof RadixSlider.Root>,
  React.ComponentPropsWithoutRef<typeof RadixSlider.Root>
>(({ className, ...props }, ref) => (
  <RadixSlider.Root
    ref={ref}
    className={cn('relative flex w-full touch-none select-none items-center', className)}
    {...props}
  >
    <RadixSlider.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-gray-200">
      <RadixSlider.Range className="absolute h-full bg-blue-500" />
    </RadixSlider.Track>
    {props.value?.map((_, i) => (
      <RadixSlider.Thumb
        key={i}
        className="block h-4 w-4 rounded-full bg-white border border-gray-400 shadow z-10 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    ))}
  </RadixSlider.Root>
));
Slider.displayName = 'Slider';
