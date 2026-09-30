import { useEffect, useMemo, useRef, useState } from 'react';
import OpenSeadragon, { TiledImage } from 'openseadragon';
import { useShallow } from 'zustand/react/shallow';
import { ViewerSvgOverlay } from '@/components/viewer-svg-overlay';
import { cn } from '@/shadcn/utils';
import { useAppStore } from '@/store/app-store';
import { getCanvasImageKey } from '../reconstruction-utils';
import { ComposerSelectionControl } from './composer-selection-control';
import { useComposerStore } from './composer-store';
import { ComposerToolbar } from './composer-toolbar';
import { ImageBoundsEditor } from './image-bounds-editor';
import { useComposerSelection } from './use-composer-selection';
import { computeVisibleIds, useVisibleCanvases } from './use-visible-canvases';
import { CanvasIndicatorLayer } from './canvas-indicator-layer';
import { usePrevious } from './use-previous';

export const OSD_SPRING_STIFFNESS = 10;
export const OSD_ANIMATION_TIME = 0.5;

// Bit of a temporary hack: number of layout items in the the initial view
const INITIAL_VISIBLE_ITEMS = 8;

const CROP_BACKGROUND_SUFFIX = ':crop-background';
const CROP_BACKGROUND_OPACITY = 0.3;

interface ImagePlacement {

  key: string;

  tileSource: object | string;

  x: number;

  y: number;

  width: number;

  clip?: OpenSeadragon.Rect;

  opacity: number;

}

interface CanvasComposerProps {

  isSidebarOpen: boolean;

  onChangeSidebarOpen(open: boolean): void;

}

export const CanvasComposer = (props: CanvasComposerProps) => {
  const elementRef = useRef<HTMLDivElement>(null);

  const layout = useComposerStore(state => state.layout);
  const viewer = useComposerStore(state => state.viewer);
  const selectedImage = useComposerStore(state => state.selectedImage);
  const editMode = useComposerStore(state => state.editMode);
  const setViewer = useComposerStore(state => state.setViewer);

  const previousSelection = usePrevious(selectedImage);

  useComposerSelection(viewer, layout);

  const visibleIds = useVisibleCanvases(viewer, layout);

  const reconstructionById = useMemo(() => 
    new Map(useAppStore.getState().reconstruction.map(r => [r.id, r]))
  , [layout]);

  const firstRender = useRef(true);
  const [isReady, setIsReady] = useState(false);

  // images per layout item
  const images = useComposerStore(useShallow(state =>
    layout.items.map(item => state.imagesByCanvasId.get(item.reconstructionCanvasId) ?? [])
  ));

  // Allows OSD and react-resizable-panel to co-exist
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const onPointerDownCapture = (e: PointerEvent) => {
      if (e.defaultPrevented) 
        e.stopPropagation();
    }

    el.addEventListener('pointerdown', onPointerDownCapture, true);
    return () => el.removeEventListener('pointerdown', onPointerDownCapture, true);
  }, []);

  useEffect(() => {
    if (!elementRef.current) return;

    const viewerInstance = OpenSeadragon({
      element: elementRef.current,
      showNavigationControl: false,
      maxZoomPixelRatio: Infinity,
      minZoomImageRatio: 0,
      animationTime: OSD_ANIMATION_TIME,
      springStiffness: OSD_SPRING_STIFFNESS,
      clickDistThreshold: 10,
      clickTimeThreshold: 400,
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: true
      },
      preserveViewport: true,
      imageLoaderLimit: 6
    });

    setViewer(viewerInstance);
    
    return () => {
      viewerInstance.destroy();
      useComposerStore.getState().tiledImages.clear();
      useComposerStore.getState().pendingTiledImageKeys.clear();
      setViewer(undefined);
    }
  }, []);

  useEffect(() => {
    if (!viewer) return;

    const isFirstRender = firstRender.current;

    if (isFirstRender) {
      const initialItems = layout.items.slice(0, INITIAL_VISIBLE_ITEMS);

      const initialHeight = initialItems.length > 0
        ? Math.max(...initialItems.map(item => item.y + item.height))
        : layout.layoutHeight;

      const aspectRatio = layout.layoutWidth / (initialHeight || 1);
      const worldRect = new OpenSeadragon.Rect(-0.15, -0.12, 1.3 * layout.layoutWidth, 1.3 * layout.layoutWidth / aspectRatio);
      viewer.viewport.fitBounds(worldRect, true);

      firstRender.current = false;
      setIsReady(true);
    }

    const { tiledImages, pendingTiledImageKeys, isUserEdit, imagesByCanvasId } = useComposerStore.getState();

    const selectedKey = selectedImage ? getCanvasImageKey(selectedImage.item.reconstructionCanvasId, selectedImage.image) : undefined;

    // Recompute directly - after `layout` change, `visibleIds` is stale. Otherwise, user
    // edits that change canvas IDs ('original' -> 'composite' canvas and vice versa) will
    // remove images, and then re-add them in the next effect run!
    const currentVisibleIds = computeVisibleIds(viewer, layout);
    const visibleItems = layout.items.filter(item => currentVisibleIds.has(item.reconstructionCanvasId));

    const placements: ImagePlacement[] = visibleItems.flatMap(item => {
      const canvas = reconstructionById.get(item.reconstructionCanvasId);
      if (!canvas) return [];

      const imagesForCanvas = imagesByCanvasId.get(item.reconstructionCanvasId) ?? [];

      return imagesForCanvas.flatMap(image => {
        const crop = image.crop;
        const bounds = crop ?? { x: 0, y: 0, w: image.resource.width, h: image.resource.height };
        
        const isCropped = !!crop && (
          crop.x !== 0 ||
          crop.y !== 0 ||
          crop.w !== image.resource.width ||
          crop.h !== image.resource.height
        );

        const scale = image.width / bounds.w;

        const placement = {
          key: getCanvasImageKey(canvas.id, image),
          tileSource: image.tileSource,
          x: item.x + (image.x - bounds.x * scale) / canvas.width,
          y: item.y + (image.y - bounds.y * scale) / canvas.width,
          width: image.resource.width * scale / canvas.width,
          clip: isCropped ? new OpenSeadragon.Rect(bounds.x, bounds.y, bounds.w, bounds.h) : undefined,
          opacity: 1
        };

        const isSelected = getCanvasImageKey(canvas.id, image) === selectedKey;

        if (!isSelected || editMode !== 'CROP' || !isCropped) return [placement];

        return [
          {
            ...placement,
            key: `${placement.key}${CROP_BACKGROUND_SUFFIX}`,
            clip: undefined,
            opacity: CROP_BACKGROUND_OPACITY
          },
          placement
        ];
      });
    });

    // Images to keep in OSD
    const toKeep = new Set(placements.map(p => p.key));

    // All placements not yet recorded in tiledImages or pendingTiledImages
    const toAdd = placements.filter(({ key }) => !tiledImages.has(key) && !pendingTiledImageKeys.has(key));

    // Any tiledImages not in the 'toKeep' list
    const toRemove = [...tiledImages.entries()].filter(([key, _]) => !toKeep.has(key));

    const previousSelectionKey = previousSelection ? 
      getCanvasImageKey(previousSelection.item.reconstructionCanvasId, previousSelection.image) : undefined;

    // Helper to catch a specific glitch in the architecture: if the
    // the user drags the selection from one canvas into another, the
    // selection will change its key! This results in a single "remove
    // image" + "add image" operation for the same OSD TiledImage.
    // This helper identifies exactly this situation, so we can later
    // shortcut this op below, without touching OpenSeadragon.
    const isSelectionKeyChange = () => {
      if (toAdd.length !== 1 || toRemove.length !== 1) return false;

      if (!previousSelection) return false;

      if (toAdd[0].key === selectedKey && toRemove[0][0] === previousSelectionKey) {
        // This op would remove the previous selection and add the new selection -
        // a no-op that only happens if the current selection changes association between
        // canvases (and, hence, the key)
        return true;
      }

      return false;
    }

    if (isSelectionKeyChange()) {
      tiledImages.set(selectedKey!, tiledImages.get(previousSelectionKey!)!);
      tiledImages.delete(previousSelectionKey!);
      return;
    }

    // 1. Remove images no longer present/visible
    toRemove.forEach(([key, tiledImage]) => {
      if (!toKeep.has(key)) {
        viewer.world.removeItem(tiledImage);
        tiledImages.delete(key);
      }
    });

    // 2. Move/resize existing images
    placements.forEach(({ key, x, y, width, clip, opacity }) => {
      const existing = tiledImages.get(key);
      if (existing) {
        existing.setPosition(new OpenSeadragon.Point(x, y), isUserEdit);
        existing.setWidth(width, isUserEdit);
        existing.setClip(clip ?? null);
        existing.setOpacity(opacity);
      }
    });

    const moveCropToFront = () => {
      if (!selectedImage || editMode !== 'CROP') return;
      
      const maxIdx = viewer.world.getItemCount() - 1;
      const selectedKey = getCanvasImageKey(selectedImage.item.reconstructionCanvasId, selectedImage.image);

      const foreground = tiledImages.get(selectedKey);
      const background = tiledImages.get(`${selectedKey}${CROP_BACKGROUND_SUFFIX}`);

      if (background && foreground) {
        viewer.world.setItemIndex(background, maxIdx);
        viewer.world.setItemIndex(foreground, maxIdx);
      } 
    }

    // 3. Add images that don't exist yet and AREN'T IN THE PROCESS OF BEING ADDED!
    // In the initial phase, an image can be loading, but not yet in `tiledImages`:
    // Once `useVisibleCanvases` picks up the initial viewport change, this effect
    // runs again, and will cause duplicates otherwise.
    toAdd.forEach(({ key, tileSource, x, y, width, clip, opacity }) => {
      pendingTiledImageKeys.add(key);

      viewer.addTiledImage({
        tileSource, x, y, width, clip, opacity,
        // @types/openseadragon mistypes this as (event: Event) => void;
        // OSD actually calls it with { item: TiledImage }.
        success: (evt: Event) => {
          const { item: tiledImage } = evt as unknown as { item: TiledImage };
          pendingTiledImageKeys.delete(key);
          tiledImages.set(key, tiledImage);
          moveCropToFront();
        }
      });
    });
  }, [viewer, layout, images, visibleIds, reconstructionById, selectedImage, editMode]);

  return (
    <div className="size-full select-none relative bg-neutral-100 bg-[radial-gradient(#e0e0e0_1px,transparent_1px)] bg-size-[16px_16px]
      [&_.openseadragon-container]:z-10 shadow-[inset_0_0_80px_-5px_rgba(0,0,0,0.06)]">
      <div ref={elementRef} className={cn('size-full leading-0', !isReady && 'invisible')}>
        {viewer && (
          <>
            <CanvasIndicatorLayer
              viewer={viewer}
              layout={layout}
              visibleIds={visibleIds} />

            <ViewerSvgOverlay
              viewer={viewer}
              topLayer={(
                <ImageBoundsEditor
                  viewer={viewer}/>
              )}/>
          </>
        )}
      </div>

      <ComposerSelectionControl
        isSidebarOpen={props.isSidebarOpen}
        onChangeSidebarOpen={props.onChangeSidebarOpen} />

      <ComposerToolbar />
    </div>
  )

}