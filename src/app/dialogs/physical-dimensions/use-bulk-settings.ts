import { useMemo } from 'react';
import type { CozyCanvas } from 'cozy-iiif';
import { useAppStore } from '@/store/app-store';

export const useBulkSettings = (canvas: CozyCanvas) => {
  const sources = useAppStore(state => state.sources);
  const sizes = useAppStore(state => state.sizes);

  const matchingCanvases = useMemo(() => {
    return sources
      .flatMap(s => s.manifest.canvases)
      .filter(c => c.id !== canvas.id && c.width === canvas.width && c.height === canvas.height)
  }, [sources, canvas.width, canvas.height, canvas.id]);

  const matchingWithoutSize = useMemo(() => {
    return matchingCanvases.filter(c => !sizes.has(c.id));
  }, [matchingCanvases, sizes]);

  return { matchingCanvases, matchingWithoutSize };
}