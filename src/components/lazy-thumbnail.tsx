import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import pLimit from 'p-limit';
import { cn } from '@/shadcn/utils';
import { Skeleton } from '@/shadcn/skeleton';

const IDLE_DELAY_MS = 350;
const FETCH_TIMEOUT_MS = 30000;

const limit = pLimit(5);
const thumbnailLoads = new Map<string, Promise<void>>();
const loadedThumbnails = new Set<string>();

const preload = (src: string) => new Promise<void>((resolve, reject) => {
  const img = new Image();

  const cleanup = () => {
    clearTimeout(timer);
    img.onload = null;
    img.onerror = null;
  };

  const fail = (reason: string) => {
    cleanup();
    reject(new Error(reason));
  };

  const timer = setTimeout(() => fail('Timeout'), FETCH_TIMEOUT_MS);

  img.onload = () => { cleanup(); resolve(); };
  img.onerror = () => { cleanup(); reject(new Error(`Failed to load: ${src}`)); };

  img.src = src;
});

const loadThumbnail = (src: string) => {
  const existing = thumbnailLoads.get(src);
  if (existing) return existing;

  const load = limit(() => preload(src));
  thumbnailLoads.set(src, load);

  void load.then(
    () => loadedThumbnails.add(src),
    () => thumbnailLoads.delete(src)
  );

  return load;
};

type LazyThumbnailState = 'pending' | 'loaded' | 'failed';

interface LazyThumbnailProps {

  src: string;

  alt: string;

  className?: string;

}

export const LazyThumbnail = (props: LazyThumbnailProps) => {
  const { src, alt, className } = props;

  const [savedState, setSavedState] = useState<{ src: string; state: LazyThumbnailState }>(
    () => ({ src, state: loadedThumbnails.has(src) ? 'loaded' : 'pending' })
  );
  const state = savedState.src === src
    ? savedState.state
    : loadedThumbnails.has(src) ? 'loaded' : 'pending';

  const { ref, inView } = useInView({
    rootMargin: '200px 0px',
    skip: state !== 'pending',
  });

  useEffect(() => {
    if (!inView || state !== 'pending') return;

    const timer = setTimeout(() => {
      void loadThumbnail(src).then(
        () => setSavedState({ src, state: 'loaded' }),
        () => setSavedState({ src, state: 'failed' })
      );
    }, IDLE_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [inView, state, src]);

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      {state === 'loaded' ? (
        <img
          src={src}
          alt={alt}
          decoding="async"
          className="size-full object-cover" />
      ) : state === 'pending' ? (
        <Skeleton className="size-full" />
      ) : state === 'failed' ? (
        <Skeleton role="img" aria-label={alt} className="size-full" />
      ) : null}
    </div>
  )

}