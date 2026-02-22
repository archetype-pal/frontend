import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as React from 'react';

export default function Loading() {
  return (
    <main className="container mx-auto p-4 max-w-6xl">
      <Skeleton className="h-4 w-48 mb-2" />
      <Skeleton className="h-10 w-2/3 mb-6" />

      <Tabs defaultValue="information" className="space-y-6">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="information">Information</TabsTrigger>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="images">Manuscript Images</TabsTrigger>
          <TabsTrigger value="graphs">Graphs</TabsTrigger>
        </TabsList>

        <TabsContent value="information" className="space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-3">
              {[...Array(5)].map((_, i) => (
                <React.Fragment key={i}>
                  <Skeleton className="h-5" />
                  <Skeleton className="h-5" />
                </React.Fragment>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
