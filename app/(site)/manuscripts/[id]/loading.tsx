import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as React from 'react';

export default function Loading() {
  return (
    <main className="container mx-auto p-4 max-w-6xl">
      <Skeleton className="h-10 w-2/3 mb-6" />

      <Tabs defaultValue="information" className="space-y-6">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="information">Information</TabsTrigger>
          <TabsTrigger value="descriptions">Descriptions</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="texts">Texts</TabsTrigger>
        </TabsList>

        <TabsContent value="information" className="space-y-6">
          <section>
            <Skeleton className="h-8 w-1/2 mb-4" />
            <Skeleton className="h-20 w-full" />
          </section>

          <section>
            <Skeleton className="h-8 w-1/3 mb-4" />
            <div className="grid grid-cols-[200px_1fr] gap-2">
              {[...Array(3)].map((_, i) => (
                <React.Fragment key={i}>
                  <Skeleton className="h-6" />
                  <Skeleton className="h-6" />
                </React.Fragment>
              ))}
            </div>
          </section>

          <section>
            <Skeleton className="h-8 w-1/3 mb-4" />
            <div className="grid grid-cols-[200px_1fr] gap-2">
              {[...Array(4)].map((_, i) => (
                <React.Fragment key={i}>
                  <Skeleton className="h-6" />
                  <Skeleton className="h-6" />
                </React.Fragment>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="descriptions" className="space-y-6">
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-40 w-full" />
        </TabsContent>

        <TabsContent value="images" className="grid md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-6 w-1/3 mx-auto" />
              <Skeleton className="h-4 w-1/4 mx-auto" />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="texts">
          <Skeleton className="h-48 w-full" />
        </TabsContent>
      </Tabs>
    </main>
  );
}
