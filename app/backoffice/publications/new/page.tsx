'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { createPublication } from '@/services/backoffice/publications';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { toast } from 'sonner';

export default function NewPublicationPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugLocked, setSlugLocked] = useState(false);
  const [isBlog, setIsBlog] = useState(false);
  const [isNews, setIsNews] = useState(false);

  const generateSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugLocked) {
      setSlug(generateSlug(value));
    }
  };

  const createMut = useMutation({
    mutationFn: () =>
      createPublication(token!, {
        title,
        slug: slug || generateSlug(title),
        content: '<p></p>',
        preview: '',
        is_blog_post: isBlog,
        is_news: isNews,
        status: 'Draft',
        author: user?.id,
      }),
    onSuccess: (data) => {
      toast.success('Publication created');
      router.push(`/backoffice/publications/${data.slug}`);
    },
    onError: (err) => {
      toast.error('Failed to create publication', {
        description: formatApiError(err),
      });
    },
  });

  const publicationKindPath = isNews ? 'news' : isBlog ? 'blogs' : 'feature';

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/backoffice/publications"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold">New Publication</h1>
      </div>

      <div className="space-y-4 rounded-lg border p-6">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="My Publication Title"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Slug</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                const next = !slugLocked;
                setSlugLocked(next);
                if (!next) setSlug(generateSlug(title));
              }}
            >
              {slugLocked ? 'Unlock (auto-generate)' : 'Lock (manual)'}
            </Button>
          </div>
          <Input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugLocked(true);
            }}
            placeholder="my-publication-title"
            className="font-mono text-sm"
          />
          {slug && (
            <p className="text-xs text-muted-foreground">URL: /publications/{publicationKindPath}/{slug}</p>
          )}
        </div>

        {user && (
          <div className="space-y-1.5">
            <Label>Author</Label>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-muted/30">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
              </span>
              <Badge variant="outline" className="text-[10px] ml-auto">
                Auto-assigned
              </Badge>
            </div>
          </div>
        )}

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isBlog} onCheckedChange={setIsBlog} />
            Blog Post
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isNews} onCheckedChange={setIsNews} />
            News
          </label>
        </div>

        <Button
          onClick={() => createMut.mutate()}
          disabled={!title.trim() || createMut.isPending}
          className="w-full"
        >
          {createMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Create & Edit
        </Button>
      </div>
    </div>
  );
}
