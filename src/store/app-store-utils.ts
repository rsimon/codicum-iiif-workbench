import { Cozy, type Bounds, type CozyCanvas, type CozyManifest } from 'cozy-iiif';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import type { ReconstructionCanvas, SourceCanvas } from '@/types';
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

export const toFragmentTarget = (canvas: CozyCanvas, bounds?: { x: number; y: number; w: number; h: number }) => {
  if (!bounds) return canvas.id;
  const x = Math.round(bounds.x);
  const y = Math.round(bounds.y);
  const w = Math.round(bounds.w);
  const h = Math.round(bounds.h);
  const isFullSize = x === 0 && y === 0 && w === canvas.width && h === canvas.height;
  return isFullSize ? canvas.id : `${canvas.id}#xywh=${x},${y},${w},${h}`;
}

const rescaleSourceCanvas = (source: SourceCanvas, factor: number): SourceCanvas => {
  const targetsByBody = new Map<object, Bounds>();

  source.canvas.images.forEach(image => {
    if (image.target) targetsByBody.set(image.source, image.target);
  });

  const rescaled = {
    ...source.canvas.source,
    items: source.canvas.source.items?.map(page => ({
      ...page,
      items: page.items?.map(annotation => {
        const bodies = Array.isArray(annotation.body) ? annotation.body : [annotation.body];

        const t = bodies
          .map(body => body && typeof body === 'object' ? targetsByBody.get(body) : undefined)
          .find(Boolean);

        return t ? {
          ...annotation,
          target: toFragmentTarget(source.canvas, { 
            x: t.x * factor, 
            y: t.y * factor,
            w: t.w * factor, 
            h: t.h * factor 
          })
        } : annotation;
      })
    }))
  };

  return {
    ...source,
    canvas: parseCanvas(rescaled)
  };
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

// Map: canvasIds in reconstruction, by manifest ID
export const buildReconstructionSourceIndex = (
  reconstruction: ReconstructionCanvas[]
): Map<string, Set<string>> => reconstruction
  .reduce<Map<string, Set<string>>>((map, r) => {
    const sources = r.type === 'original' ? [r.source] : r.sources;
    
    sources.forEach(s => {
      const set = map.get(s.sourceManifestId) || new Set();
      set.add(s.canvas.id);
      map.set(s.sourceManifestId, set);
    });

    return map;
  }, new Map());

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
  const { width, height, physicalSize } = reconstruction.length > 0
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
      height,
      physicalSize
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
  
  const units = new Set(current.map(r => r.physicalSize?.unit).filter(Boolean));
  const usePhysicalSize = current.length > 0 &&
    units.size === 1 &&
    current.every(r => r.physicalSize);

  const getRescaleFactor = (from: ReconstructionCanvas, to: ReconstructionCanvas) => {
    if (!usePhysicalSize || !from.physicalSize || !to.physicalSize) return 1;

    const fromPxPerUnit = from.width / from.physicalSize.width;
    const toPxPerUnit = to.width / to.physicalSize.width;

    return toPxPerUnit / fromPxPerUnit;
  }

  const sourcesOf = (r: ReconstructionCanvas) =>
    r.type === 'original' ? [r.source] : r.sources;

  const sourcesToMerge = toMerge.flatMap(r => {
    const factor = getRescaleFactor(r, destination);
    return sourcesOf(r).map(source => rescaleSourceCanvas(source, factor));
  }, []);

  const annotationsToMerge = toMerge.flatMap(r => r.annotations ?? []);
    
  return removeCanvasFromReconstruction(current, others.map(r => r.id))
    .map(r => { 
      if (r.id === destination.id) {
        if (r.type === 'composite') {
          // Simple case - destination is already a composite
          return {
            ...r,
            sources: sourcesToMerge,
            annotations: annotationsToMerge
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
            physicalSize: r.physicalSize,
            annotations: annotationsToMerge
          }
        }
      } else {
        return r;
      }
    });
}
