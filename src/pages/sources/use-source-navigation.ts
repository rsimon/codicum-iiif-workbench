import { useCallback, useMemo } from 'react';
import type { CozyCanvas } from 'cozy-iiif';
import { useAppStore } from '@/store/app-store';
import type { SourceManifest } from '@/types';
import { useSelectedSource, useSourcesStore } from './sources-store';
import { buildReconstructionSourceIndex } from '@/store/app-store-utils';

export interface FilteredSources {

  source: SourceManifest;
  
  canvases: CozyCanvas[];

}

export const useSourceNavigation = () => {
  const sources = useAppStore(state => state.sources);
  const reconstruction = useAppStore(state => state.reconstruction);

  const showInReconstructionOnly = useSourcesStore(state => state.showInReconstructionOnly);
  const setSelection = useSourcesStore(state => state.setSelection);

  const { manifest: selectedManifest, canvas: selectedCanvas } = useSelectedSource();

  // Map: canvasIds in reconstruction, by manifest ID
  const inReconstructionByManifest = useMemo(() => 
    buildReconstructionSourceIndex(reconstruction)
  , [reconstruction]);

  const sourceCanvasesInReconstruction = useMemo(() =>
    [...inReconstructionByManifest.values()].reduce((total, r) => total + r.size, 0)
  , [inReconstructionByManifest]);

  const filteredSources: FilteredSources[] = useMemo(() =>
    showInReconstructionOnly 
      ? sources.map(s => ({
          source: s, 
          canvases: s.manifest.canvases.filter(canvas => inReconstructionByManifest.get(s.manifest.id)?.has(canvas.id))
        }))

        // inReconstructionByManifest.get(manifestId)?.has(canvasId) ?? false
      : sources.map(s => ({ source: s, canvases: s.manifest.canvases }))
    , [sources, showInReconstructionOnly, inReconstructionByManifest]);

  const visibleCanvases = useMemo(() =>  
    filteredSources.flatMap(t => 
      t.canvases.map(canvas => ({ manifestId: t.source.manifest.id, canvas })))
  , [filteredSources]);

  const currentSelectedIndex = useMemo(() =>
    visibleCanvases.findIndex(v => 
        v.manifestId === selectedManifest?.id && v.canvas.id === selectedCanvas?.id)
  , [visibleCanvases, selectedManifest, selectedCanvas]);

  const countCanvasesInReconstruction = useCallback((manifestId: string) => 
    inReconstructionByManifest.get(manifestId)?.size ?? 0
  , [inReconstructionByManifest]);

  const isInReconstruction = useCallback((manifestId: string, canvasId: string) => 
    inReconstructionByManifest.get(manifestId)?.has(canvasId) ?? false
  , [inReconstructionByManifest]);

  const selectNext = useCallback(() => {
    const next = visibleCanvases[currentSelectedIndex + 1];
    if (next) setSelection({ manifestId: next.manifestId, canvasId: next.canvas.id });
  }, [visibleCanvases, currentSelectedIndex, setSelection]);

  const selectPrevious = useCallback(() => {
    if (currentSelectedIndex <= 0) return;

    const previous = visibleCanvases[currentSelectedIndex - 1];
    setSelection({ manifestId: previous.manifestId, canvasId: previous.canvas.id });
  }, [visibleCanvases, currentSelectedIndex, setSelection]);

  return { 
    currentSelectedIndex,
    filteredSources, 
    selectedCanvas,
    selectedManifest,
    visibleCanvases, 
    countCanvasesInReconstruction,
    isInReconstruction,
    selectNext,
    selectPrevious,
    sourceCanvasesInReconstruction
   };
  
}
