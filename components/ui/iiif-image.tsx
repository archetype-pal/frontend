import Image, { type ImageProps } from 'next/image';

/**
 * Wrapper around next/image that always sets `unoptimized`.
 *
 * IIIF images are served from dynamic external hosts that may not match
 * Next.js remotePatterns. Passing them through the Next.js image optimizer
 * breaks them. This component centralises that concern so individual call
 * sites never need to remember to add the prop.
 */
export function IiifImage(props: Omit<ImageProps, 'unoptimized'>) {
  // eslint-disable-next-line jsx-a11y/alt-text -- alt is required by ImageProps and forwarded via spread
  return <Image {...props} unoptimized />;
}
