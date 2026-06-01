'use client';

import { Button } from '@/components/ui/button';

export function ViewerLoadingState() {
  return <div className="flex h-[100dvh] items-center justify-center">Loading...</div>;
}

export function ViewerErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-[100dvh] items-center justify-center">
      <div className="text-center">
        <p className="text-destructive mb-4">{message}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    </div>
  );
}
