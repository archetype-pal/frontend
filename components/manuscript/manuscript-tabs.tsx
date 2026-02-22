'use client';

import { Book, FileText, ImageIcon, Info, Lock } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ManuscriptTabs() {
  return (
    <div className="flex items-center gap-4 border-b px-4 py-2">
      <Tabs defaultValue="manuscript" className="w-full">
        <TabsList className="grid w-fit grid-cols-6 gap-4">
          <TabsTrigger value="manuscript" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            <span>Manuscript Image</span>
          </TabsTrigger>
          <TabsTrigger value="annotations" className="gap-2">
            <FileText className="h-4 w-4" />
            <span>Annotations (0)</span>
          </TabsTrigger>
          <TabsTrigger value="texts" className="gap-2">
            <Book className="h-4 w-4" />
            <span>Texts (2)</span>
          </TabsTrigger>
          <TabsTrigger value="other-images" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            <span>Other Images (1)</span>
          </TabsTrigger>
          <TabsTrigger value="document" className="gap-2">
            <Lock className="h-4 w-4" />
            <span>Document</span>
          </TabsTrigger>
          <TabsTrigger value="copyright" className="gap-2">
            <Info className="h-4 w-4" />
            <span>Image Copyright</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
