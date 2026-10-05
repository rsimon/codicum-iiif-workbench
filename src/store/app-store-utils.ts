import { Cozy, type CozyCanvas, type CozyManifest } from 'cozy-iiif';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import type { SourceCanvas, ReconstructionCanvas } from '@/types';
import type { MoveDirection } from './app-store';

export const parseCanvas = (source: unknown): CozyCanvas => {
  const parsed = Cozy.parse(source);

  if (parsed.type !== 'canvas') {
    console.error(parsed);
    throw new Error('IIIF Canvas parse error');
  }

  return parsed.resource;
}

export const parseManifest = (source: unknown): CozyManifest => {
  const parsed = Cozy.parse(source);

  if (parsed.type !== 'manifest') {
    console.error(parsed);
    throw new Error('IIIF Manifest parse error');
  }

  return parsed.resource;
}

export const parseNumber = (s: string): number | undefined => {
  const n = Number.parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export const getEmptyCanvasLabel = (reconstruction: ReconstructionCanvas[]) => {
  const regex = /^New Composite( \((\d+)\))?$/;

  const numbers = reconstruction
    .map(rc => rc.label.match(regex))
    .filter(Boolean)
    .map(match => (match![2] ? parseInt(match![2]) : 0));

  if (numbers.length === 0) return 'New Composite';

  const max = Math.max(...numbers);
  return max === 0 ? 'New Composite (1)' : `New Composite (${max + 1})`;
}

// Removes a **reconstruction** canvas
export const removeCanvasFromReconstruction = (reconstruction: ReconstructionCanvas[], toRemove: string | string[]) => {
  const canvasIds = Array.isArray(toRemove) ? new Set(toRemove) : new Set([toRemove]);
  return reconstruction
    // Remove canvas at root level
    .filter(r => !canvasIds.has(r.id)) 
    // Remove canvas from composites
    .map(r => {
      if (r.type === 'original' || r.sources.every(r => !canvasIds.has(r.canvas.id))) {
        return r;
      } else {
        return {
          ...r,
          sources: r.sources.filter(s => !canvasIds.has(s.canvas.id))
        }
      }
    });
}

// Removes a **source** canvas (also removing the corresponding reconstruction canvas
// in case it contains only this source canvas
export const removeSourceCanvasFromReconstruction = (
  reconstruction: ReconstructionCanvas[],
  toRemove: string | string[]
): ReconstructionCanvas[] => {
  const toRemoveIds = Array.isArray(toRemove) ? new Set(toRemove) : new Set([toRemove]);

  return reconstruction
    .filter(r => r.type !== 'original' || !toRemoveIds.has(r.source.canvas.id))
    .map(r => {
      if (r.type === 'original') return r;

      const isAffected = r.sources.some(s => toRemoveIds.has(s.canvas.id));
      return isAffected ? {
        ...r,
        sources: r.sources.filter(s => !toRemoveIds.has(s.canvas.id))
      } : r
    });
}

export const appendEmptyCanvas = (
  reconstruction: ReconstructionCanvas[], 
  baseURI: string,
  fallbackWidth = 1000, 
  fallbackHeight = 1000
): ReconstructionCanvas[] => {
  const { width, height } = reconstruction.length > 0
    ? reconstruction[reconstruction.length - 1]
    : { width: fallbackWidth, height: fallbackHeight };

  return [
    ...reconstruction,
    {
      type: 'composite',
      id: `${baseURI}/canvas/${crypto.randomUUID()}`,
      label: getEmptyCanvasLabel(reconstruction),
      sources: [],
      width, 
      height
    }
  ]
}

export const moveCanvas = (
  reconstruction: ReconstructionCanvas[],
  canvasId: string,
  direction: MoveDirection
): ReconstructionCanvas[] => {
  const startIndex = reconstruction.findIndex(r => r.id === canvasId);
  if (startIndex === -1) return reconstruction;

  const finishIndex =
    direction === 'top' ? 0 :
    direction === 'bottom' ? reconstruction.length - 1 :
    direction === 'up' ? startIndex - 1 :
    startIndex + 1;

  if (finishIndex === startIndex || finishIndex < 0 || finishIndex >= reconstruction.length)
    return reconstruction;

  return reorder({ list: reconstruction, startIndex, finishIndex });
}

export const insertCanvasesAtIndex = (
  reconstruction: ReconstructionCanvas[],
  canvasIds: string[],
  index: number
): ReconstructionCanvas[] => {
  const ids = new Set(canvasIds);
  const canvases = canvasIds
    .map(id => reconstruction.find(canvas => canvas.id === id)!).filter(Boolean);

  const targetIndex = Math.max(0, Math.min(index, reconstruction.length));

  const removedBeforeIndex = reconstruction
    .slice(0, targetIndex)
    .filter(canvas => ids.has(canvas.id))
    .length;

  const remaining = reconstruction.filter(canvas => !ids.has(canvas.id));
  const insertionIndex = targetIndex - removedBeforeIndex;

  return [
    ...remaining.slice(0, insertionIndex),
    ...canvases,
    ...remaining.slice(insertionIndex)
  ];
}

export const mergeInto = (
  toMerge: ReconstructionCanvas[], 
  current: ReconstructionCanvas[],
  baseURI: string
): ReconstructionCanvas[] => {
  if (toMerge.length < 2) return current;

  const [destination, ...others] = toMerge;

  const sourcesToMerge = toMerge.reduce<SourceCanvas[]>((all, r) =>
    r.type === 'original' ? [...all, r.source] : [...all, ...r.sources]
  , []);
    
  return removeCanvasFromReconstruction(current, others.map(r => r.id))
    .map(r => { 
      if (r.id === destination.id) {
        if (r.type === 'composite') {
          // Simple case - destination is already a composite
          return {
            ...r,
            sources: sourcesToMerge
          };
        } else {
          return {
            type: 'composite',
            id: `${baseURI}/${crypto.randomUUID()}`,
            sources: sourcesToMerge,
            // Keep destination label and size
            label: r.label,
            width: r.width,
            height: r.height,
            physicalSize: r.physicalSize
          }
        }
      } else {
        return r;
      }
    });
}
