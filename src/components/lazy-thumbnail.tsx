import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import pLimit from 'p-limit';
import type { CozyCanvas } from 'cozy-iiif';
import { getThumbnailURL } from 'cozy-iiif/level-0';
import { cn } from '@/shadcn/utils';
import { Skeleton } from '@/shadcn/skeleton';

const IDLE_DELAY_MS = 350;
const FETCH_TIMEOUT_MS = 30000;

const limit = pLimit(5);
const thumbnailLoads = new Map<string, Promise<string>>();
const loadedThumbnails = new Map<string, string>();

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

const loadThumbnail = (canvas: CozyCanvas) => {
  const cached = loadedThumbnails.get(canvas.id);
  if (cached) return Promise.resolve(cached);

  const existing = thumbnailLoads.get(canvas.id);
  if (existing) return existing;

  const load = limit(async () => {
    const src = await getThumbnailURL(canvas, canvas.images, { size: 350 });
    if (!src)
      throw new Error(`Failed to get thumbnail URL for canvas: ${canvas.id}`);

    await preload(src);
    return src;
  });
  thumbnailLoads.set(canvas.id, load);

  void load.then(
    src => loadedThumbnails.set(canvas.id, src),
    () => thumbnailLoads.delete(canvas.id)
  );

  return load;
};

type LazyThumbnailState = 'pending' | 'loading' | 'loaded' | 'failed';

interface LazyThumbnailProps {

  canvas: CozyCanvas;

  alt: string;

  className?: string;

}

export const LazyThumbnail = (props: LazyThumbnailProps) => {
  const { canvas, alt, className } = props;

  const [savedState, setSavedState] = useState<{
    canvasId: string;
    src?: string;
    state: LazyThumbnailState;
  }>(
    () => {
      const src = loadedThumbnails.get(canvas.id);
      return {
        canvasId: canvas.id,
        src,
        state: src ? 'loaded' : 'pending'
      };
    }
  );
  const state = savedState.canvasId === canvas.id
    ? savedState.state
    : loadedThumbnails.has(canvas.id) ? 'loaded' : 'pending';
  const src = savedState.canvasId === canvas.id
    ? savedState.src
    : loadedThumbnails.get(canvas.id);

  const { ref, inView } = useInView({
    rootMargin: '200px 0px',
    skip: state !== 'pending',
  });

  useEffect(() => {
    if (!inView || state !== 'pending') return;

    const timer = setTimeout(() => {
      setSavedState({ canvasId: canvas.id, state: 'loading' });
      void loadThumbnail(canvas).then(
        src => setSavedState({ canvasId: canvas.id, src, state: 'loaded' }),
        () => setSavedState({ canvasId: canvas.id, state: 'failed' })
      );
    }, IDLE_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [canvas, inView, state]);

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      {state === 'loaded' && src ? (
        <img
          src={src}
          alt={alt}
          decoding="async"
          className="size-full object-cover" />
      ) : state === 'pending' || state === 'loading' ? (
        <Skeleton className="size-full" />
      ) : state === 'failed' ? (
        <Skeleton role="img" aria-label={alt} className="size-full" />
      ) : null}
    </div>
  )

}