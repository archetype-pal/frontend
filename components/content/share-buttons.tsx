'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ShareButtonsProps {
  title: string;
  author: string;
  slug: string;
}

export default function ShareButtons({ title, author, slug }: ShareButtonsProps) {
  const [currentUrl, setCurrentUrl] = useState<string>('');

  useEffect(() => {
    setCurrentUrl(`${window.location.origin}/posts/${slug}`);
  }, [slug]);

  const handleShare = async (platform?: 'twitter' | 'facebook') => {
    if (!currentUrl) return;

    const shareText = `${title}\n\nBy ${author}`;

    if (!platform) {
      if (navigator.share) {
        try {
          await navigator.share({
            title,
            text: shareText,
            url: currentUrl,
          });
          return;
        } catch (err) {
          console.error('Error sharing:', err);
        }
      }
    }

    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          shareText
        )}&url=${encodeURIComponent(currentUrl)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
        break;
      default:
        return;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="text-[#2B4C6F] hover:text-[#2B4C6F]/80"
        onClick={() => handleShare('twitter')}
        disabled={!currentUrl}
      >
        Share on Twitter
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-[#2B4C6F] hover:text-[#2B4C6F]/80"
        onClick={() => handleShare('facebook')}
        disabled={!currentUrl}
      >
        Share on Facebook
      </Button>
    </div>
  );
}
