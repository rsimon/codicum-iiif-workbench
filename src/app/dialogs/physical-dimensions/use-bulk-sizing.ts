import { useMemo } from 'react';
import { useAppStore } from '@/store/app-store';

export const useBulkSizing = (size: { width: number; height: number; }) => {
  const sources = useAppStore(state => state.sources);

  const canvasesWithSize = useMemo(() => (
    sources
      .flatMap(s => s.manifest.canvases)
      .filter(c => c.width === size.width && c.height === size.height )
  ), [sources, size.width, size.height]);

  return { canvasesWithSize };
}