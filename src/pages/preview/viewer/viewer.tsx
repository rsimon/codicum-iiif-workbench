import { useEffect, useRef, useState } from 'react';
import OpenSeadragon from 'openseadragon';
import type { Viewer as OpenSeadragonViewer } from 'openseadragon';
import { cn } from '@/shadcn/utils';
import type { ReconstructionCanvas } from '@/types';
import { usePreviewStore } from '../preview-store';
import { addPage, getCanvasHeight } from '../preview-utils';
import { CanvasIndicator } from './canvas-indicator';
import { TextAnnotationLayer } from './text-annotation-layer';
import { ViewerControls } from './viewer-controls';
import { ViewerToolbar } from './viewer-toolbar';

interface ViewerProps {

  isInspectorOpen: boolean;

  onChangeInspectorOpen(open: boolean): void;

}

export interface CanvasPlacement {
  
  canvas: ReconstructionCanvas;
  
  // OSD world coordinates
  x: number; 
  
  y: number; 
  
  width: number; 
  
  height: number; 

}

// Horizontal gap between pages
const PAGE_GAP = 0;

export const Viewer = (props: ViewerProps) => {
  const selectedView = usePreviewStore(state => state.selectedView);
  const { left, right } = selectedView ?? {};

  const elementRef = useRef<HTMLDivElement>(null);

  const [viewer, setViewer] = useState<OpenSeadragonViewer | null>(null);
  const [canvasBounds, setCanvasBounds] = useState<CanvasPlacement[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!elementRef.current) return;

    const v = OpenSeadragon({
      element: elementRef.current,
      showNavigationControl: false,
      maxZoomPixelRatio: 10,
      minZoomImageRatio: 0,
      visibilityRatio: 0,
      animationTime: 0.5,
      springStiffness: 10,
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: true
      }
    });

    setViewer(v);

    return () => {
      v.destroy();
      setViewer(null);
    };
  }, []);

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
    if (!viewer || !(left || right)) return;

    setIsReady(false);

    let cancelled = false;

    const leftHeight = getCanvasHeight(left);
    const rightHeight = getCanvasHeight(right);

    const heights = [leftHeight, rightHeight].filter(c => c !== undefined);
    const totalHeight = heights.length > 0 ? Math.max(...heights) : 1;

    const totalWidth = (leftHeight && rightHeight) ? 2 + PAGE_GAP : 1;

    const leftBounds = left && leftHeight ? {
      canvas: left,
      x: 0, 
      y: (totalHeight - leftHeight) / 2,
      width: 1,
      height: leftHeight
    } : undefined;

    const rightBounds = right && rightHeight ? {
      canvas: right,
      x: 1 + PAGE_GAP, 
      y: (totalHeight - rightHeight) / 2,
      width: 1,
      height: rightHeight
    } : undefined;

    // Center each page vertically against the taller of the two.
    const addLeft = (left && leftBounds) ? addPage(viewer, left, leftBounds.x, leftBounds.y) : undefined;
    const addRight = (right && rightBounds) ? addPage(viewer, right, rightBounds.x, rightBounds.y) : undefined;

    Promise.all([addLeft, addRight]).then(() => {
      if (cancelled) return;

      const viewRect = new OpenSeadragon.Rect(-0.15, -0.12, totalWidth + 0.3, totalHeight + 0.4);
      viewer.viewport.fitBounds(viewRect, true);
      setIsReady(true);
    }).then(() => {
      setCanvasBounds([leftBounds, rightBounds].filter(b => b !== undefined));
    });

    return () => {
      cancelled = true;
      viewer.world.removeAll();
      setCanvasBounds([]);
    }
  }, [viewer, left, right]);

  return (
    <div className="size-full relative bg-neutral-100 [&_.openseadragon-container]:z-10 shadow-[inset_0_0_80px_-5px_rgba(0,0,0,0.07)]">
      <div ref={elementRef} className={cn('size-full', !isReady && 'invisible')}>
        {viewer && (
          <>
            <CanvasIndicator 
              viewer={viewer} 
              canvases={canvasBounds} />

            <TextAnnotationLayer
              viewer={viewer} 
              canvases={canvasBounds} />
          </>
        )}
      </div>

      <ViewerControls
        viewer={viewer}
        isInspectorOpen={props.isInspectorOpen}
        onChangeInspectorOpen={props.onChangeInspectorOpen} />

      <ViewerToolbar />
    </div>
  )

}
