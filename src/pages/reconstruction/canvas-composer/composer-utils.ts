import type { Point } from 'openseadragon';
import type { CozyCanvas, CozyImageResource } from 'cozy-iiif';
import { parseCanvas } from '@/store/app-store-utils';
import type { ReconstructionCanvas, SourceCanvas } from '@/types';
import type { ComposerLayout, ComposerLayoutItem, DraggableImage, DraggableImageSelection } from '../reconstruction-types';
import { getCanvasImageKey } from '../reconstruction-utils';

const DEFAULT_IMAGE_WIDTH = 0.4;
const DEFAULT_IMAGE_STEP = 0.05; // rightward/downward shift per stacked image

export const getImageBounds = (image: CozyImageResource) => ({
  x: 0,
  y: 0,
  w: image.width,
  h: image.height
});

export const toDraggableImages = (r: ReconstructionCanvas): DraggableImage[] => {
  const sources = r.type === 'original' ? [r.source] : r.sources;

  return sources.reduce<DraggableImage[]>((agg, source) => {
    return [
      ...agg, 
      ...source.canvas.images.map((image, idx) => {
        const runningIndex = agg.length + idx;

        const defaultWidth = runningIndex === 0 
          ? source.canvas.width : source.canvas.width * DEFAULT_IMAGE_WIDTH;
          
        const defaultOffset = runningIndex === 0
          ? 0 : source.canvas.width * DEFAULT_IMAGE_STEP * runningIndex;

        const x = image.target ? image.target.x : defaultOffset;
        const y = image.target ? image.target.y : defaultOffset;
        const width = image.target ? image.target.w : defaultWidth;

        return {
          sourceCanvasId: source.canvas.id,
          sourceCanvasInstanceId: source.instanceId,
          resource: image,
          tileSource: image.type === 'dynamic' || image.type === 'level0' ? image.serviceUrl : {
            type: 'image',
            url: image.getImageURL()
          },
          x,
          y,
          width,
          crop: image.selector,
          index: idx
        } as DraggableImage
      })
    ]
  }, []);
}

// x/y/width an image must have to fully fit the canvas
export const getFillSize = (
  image: DraggableImage,
  canvas: ReconstructionCanvas
): { x: number; y: number; width: number } => {
  const { width: canvasWidth, height: canvasHeight } = canvas;

  const bounds = image.crop ?? getImageBounds(image.resource);
  const aspect = bounds.h / bounds.w;
  const width = Math.min(canvasWidth, canvasHeight / aspect);
  const height = width * aspect;

  return {
    x: (canvasWidth - width) / 2,
    y: (canvasHeight - height) / 2,
    width
  };
}

export const isSelectionFullSize = (
  selection: DraggableImageSelection,
  reconstruction: ReconstructionCanvas[]
): boolean => {
  const FILL_SIZE_EPSILON = 1e-6;

  const canvas = reconstruction.find(r => r.id === selection.item.reconstructionCanvasId);
  if (!canvas) return false;

  const fill = getFillSize(selection.image, canvas);

  return Math.abs(selection.image.x - fill.x) < FILL_SIZE_EPSILON &&
    Math.abs(selection.image.y - fill.y) < FILL_SIZE_EPSILON &&
    Math.abs(selection.image.width - fill.width) < FILL_SIZE_EPSILON;
}

export const getIntersectingItems = (
  rect: { x1: number; y1: number; x2: number; y2: number },
  layout: ComposerLayout
): ComposerLayoutItem[] => {
  const minX = Math.min(rect.x1, rect.x2);
  const maxX = Math.max(rect.x1, rect.x2);
  const minY = Math.min(rect.y1, rect.y2);
  const maxY = Math.max(rect.y1, rect.y2);

  return layout.items.filter(item => {
    const itemRight = item.x + item.width;
    const itemBottom = item.y + item.height;
    return item.x <= maxX && itemRight >= minX && item.y <= maxY && itemBottom >= minY;
  });
}

export const getItemAt = (point: Point, layout: ComposerLayout): ComposerLayoutItem => {
  const hits = layout.items.filter(item => {
    const right = item.x + item.width;
    const bottom = item.y + item.height;
    return point.x >= item.x && point.x <= right && point.y >= item.y && point.y <= bottom;
  });

  return hits.sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    return areaA - areaB;
  })[0];
}

export const getImageAt = (
  point: Point,
  layout: ComposerLayout,
  reconstruction: ReconstructionCanvas[],
  imagesByCanvasId: Map<string, DraggableImage[]>
): DraggableImageSelection | undefined => {
  const item = getItemAt(point, layout);
  if (!item) return;
  
  const rc = reconstruction.find(r => r.id === item.reconstructionCanvasId);
  if (!rc) return;

  const images = imagesByCanvasId.get(item.reconstructionCanvasId) ?? [];

  const hit = images.filter(image => {
    // Image size is in pixel!
    const bounds = image.crop ?? getImageBounds(image.resource);
    const aspect = bounds.h / bounds.w;

    const viewportX = item.x + image.x / rc.width;
    const viewportY = item.y + image.y / rc.width;
    const viewportW = image.width / rc.width;

    const viewportR = viewportX + viewportW;
    const viewportB = viewportY + viewportW * aspect;

    return point.x >= viewportX && point.x <= viewportR && point.y >= viewportY && point.y <= viewportB;
  }).sort((a, b) => {
    const boundsA = a.crop ?? getImageBounds(a.resource);
    const boundsB = b.crop ?? getImageBounds(b.resource);
    const areaA = a.width * a.width * boundsA.h / boundsA.w;
    const areaB = b.width * b.width * boundsB.h / boundsB.w;
    return areaA - areaB;
  })[0];

  if (!hit) return;

  const sourceCanvas = rc.type === 'original'
    ? rc.source
    : rc.sources.find(s => s.canvas.id === hit.sourceCanvasId);

  const isValidSource = sourceCanvas && sourceCanvas.canvas.id === hit.sourceCanvasId;
  if (!isValidSource) {
    // Should never happen
    console.warn(`Source canvas integrity error: hit points to ${hit.sourceCanvasId}, but not found in reconstruction canvas`);
    console.warn(rc);
    return;
  }

  // Splitting images inside source canvases is not supported - only
  // allow changing association for this hit if it's the only image in its canvas
  const canChangeItem = hit ? sourceCanvas.canvas.images.length === 1 : false;
  return { item, image: hit, canChangeItem };
}

export const findSourceCanvasById = (
  sourceCanvasId: string,
  reconstruction: ReconstructionCanvas[]
): SourceCanvas | undefined => {
  for (const canvas of reconstruction) {
    const sources = canvas.type === 'original' ? [canvas.source] : canvas.sources;
    const found = sources.find(s => s.canvas.id === sourceCanvasId);
    if (found) return found;
  }
}

// Applies composer edits back into an app-level reconstruction
export const applyEdits = (
  reconstruction: ReconstructionCanvas[],
  imagesByCanvasId: Map<string, DraggableImage[]>
): ReconstructionCanvas[] => {
  const sourceCanvasInstances = new Map<string, SourceCanvas>();

  // Indexed current images (before edit)
  const currentImagesBySourceInstanceId = new Map<string, DraggableImage[]>();
  
  reconstruction.forEach(r => {
    // Images before edit
    const currentImagees = toDraggableImages(r);

    const sources = r.type === 'original' ? [r.source] : r.sources;
  
    sources.forEach(source => {
      sourceCanvasInstances.set(source.instanceId, source);
      currentImagesBySourceInstanceId.set(
        source.instanceId,
        currentImagees.filter(image => image.sourceCanvasInstanceId === source.instanceId)
      );
    });
  });

  return reconstruction
    .filter(r => imagesByCanvasId.has(r.id))
    .map(r => {
      // Images in the composer (with user edits)
      const composerImages = imagesByCanvasId.get(r.id)!;
      const seenSources = new Set<string>();
      const sources = composerImages.flatMap(image => {
        if (seenSources.has(image.sourceCanvasInstanceId)) return [];
        seenSources.add(image.sourceCanvasInstanceId);
        const source = sourceCanvasInstances.get(image.sourceCanvasInstanceId);
        return source ? [source] : [];
      });

      const applySourceEdits = (source: SourceCanvas) => applyEditsToSource(
        r,
        source,
        composerImages,
        currentImagesBySourceInstanceId.get(source.instanceId) ?? []
      );

      if (r.type === 'original') {
        if (sources.length === 1 && sources[0].instanceId === r.source.instanceId) {
          const nextSource = applySourceEdits(r.source);
          return nextSource === r.source ? r : { ...r, source: nextSource };
        }

        return {
          type: 'composite' as const,
          id: r.id,
          label: r.label,
          sources: sources.map(applySourceEdits),
          width: r.width,
          height: r.height,
          physicalSize: r.physicalSize
        };
      } else {
        const nextSources = sources.map(applySourceEdits);

        // Just one source left - revert to OriginalCanvas
        if (nextSources.length === 1) {
          const source = nextSources[0];
          return {
            type: 'original' as const,
            id: r.id,
            label: r.label,
            source,
            width: r.width,
            height: r.height,
            physicalSize: r.physicalSize ?? source.physicalSize
          };
        }

        const unchanged = nextSources.length === r.sources.length &&
          nextSources.every((source, index) => source === r.sources[index]);

        return unchanged ? r : { ...r, sources: nextSources };
      }
    });
}

const toFragmentTarget = (canvas: CozyCanvas, bounds?: { x: number; y: number; w: number; h: number }) => {
  if (!bounds) return canvas.id;
  const x = Math.round(bounds.x);
  const y = Math.round(bounds.y);
  const w = Math.round(bounds.w);
  const h = Math.round(bounds.h);
  const isFullSize = x === 0 && y === 0 && w === canvas.width && h === canvas.height;
  return isFullSize ? canvas.id : `${canvas.id}#xywh=${x},${y},${w},${h}`;
}

const toAnnotationBodyItem = (image: DraggableImage) => {
  if (!image.crop && (image.resource.source.type === 'Image'))
    return image.resource.source;

  // No crop, but image resource is (unnecessarily) a SpecificResource
  if (!image.crop)
    return (image.resource.source as any).source;

  const { crop } = image;
  const { source } = image.resource;
  const isFullSizeCrop = crop.x === 0 && crop.y === 0 && crop.w === image.resource.width && crop.h === image.resource.height;
  
  // Cropped, but fullsize - normalize to flat, uncropped Image resource
  if (isFullSizeCrop)
    return (image.resource.source as any).source;

  // Cropped image
  const id = typeof source.id === 'string' ? source.id.replace(/#xywh=.*$/, '') : source.id;

  return source.type === 'Image' ? {
    type: 'SpecificResource' as const,
    source: {
      ...source,
      id
    },
    selector: {
      type: 'ImageApiSelector' as const,
      region: `${Math.round(crop.x)},${Math.round(crop.y)},${Math.round(crop.w)},${Math.round(crop.h)}`
    }
  } : {
    ...source,
    selector: {
      type: 'ImageApiSelector' as const,
      region: `${Math.round(crop.x)},${Math.round(crop.y)},${Math.round(crop.w)},${Math.round(crop.h)}`
    }
  };
}

// Applies composer edits onto one source canvas
const applyEditsToSource = (
  canvas: ReconstructionCanvas,
  source: SourceCanvas, 
  composerImages: DraggableImage[], 
  currentImages: DraggableImage[]
): SourceCanvas => {
  const currentImagesByKey = new Map(currentImages
    .filter(img => img.sourceCanvasInstanceId === source.instanceId)
    .map(img => [getCanvasImageKey(canvas.id, img), img] as const));

  // Shorthands to original source canvas elements
  const canvasSource = source.canvas.source;
  const canvasSourcePage = canvasSource.items?.[0];
  const canvasSourcePaintAnnotations = canvasSourcePage?.items ?? [];

  let touched = false;

  const sourceImages = composerImages.filter(img => img.sourceCanvasInstanceId === source.instanceId);
  const existingImages = currentImages.filter(img => img.sourceCanvasInstanceId === source.instanceId);

  if (sourceImages.length !== existingImages.length ||
    sourceImages.some((image, index) => image.index !== existingImages[index]?.index)) {
    touched = true;
  }

  const orderedAnnotations = sourceImages.map(draggable => {
    const key = getCanvasImageKey(canvas.id, draggable);
    const current = currentImagesByKey.get(key);
    const currentIndex = current?.index;

    if (!current || currentIndex === undefined) {
      touched = true;

      const bounds = draggable.crop ?? getImageBounds(draggable.resource);
      const h = draggable.width * bounds.h / bounds.w;
      return {
        id: `${source.canvas.id}/annotation/${crypto.randomUUID()}`,
        type: 'Annotation',
        motivation: 'painting',
        body: toAnnotationBodyItem(draggable),
        target: toFragmentTarget(source.canvas, { x: draggable.x, y: draggable.y, w: draggable.width, h })
      };
    }

    const unchanged = current.x === draggable.x && current.y === draggable.y && current.width === draggable.width &&
      JSON.stringify(current.crop) === JSON.stringify(draggable.crop);

    if (unchanged) return canvasSourcePaintAnnotations[currentIndex];

    touched = true;

    const bounds = draggable.crop ?? getImageBounds(draggable.resource);
    const h = draggable.width * bounds.h / bounds.w;
    return {
      ...canvasSourcePaintAnnotations[currentIndex],
      body: toAnnotationBodyItem(draggable),
      target: toFragmentTarget(source.canvas, { x: draggable.x, y: draggable.y, w: draggable.width, h })
    };
  });

  if (!touched) return source;

  const nextRawCanvas = {
    ...canvasSource,
    items: [
      canvasSourcePage ? { 
        ...canvasSourcePage, 
        items: orderedAnnotations
      } : { 
        id: `${source.canvas.id}/page/${crypto.randomUUID()}`, 
        type: 'AnnotationPage', 
        items: orderedAnnotations
      }
    ]
  };

  return { ...source, canvas: parseCanvas(nextRawCanvas) };
}