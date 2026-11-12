import { useEffect, useRef } from 'react';
import type { Viewer } from 'openseadragon';
import { useReconstructionStore } from '../../reconstruction-store';
import type { ComposerLayout } from '../../reconstruction-types';
import { useCanvasOutlines } from './use-canvas-outlines';
import { useScaleGrid } from './use-scale-grid';

interface LayoutGuidesLayerProps {

  viewer: Viewer;

  layout: ComposerLayout;

  visibleIds: Set<string>;

  showGrid?: boolean;

  showGridLabels?: boolean;

}

const dpr = window.devicePixelRatio || 1;

// Shorthand
const setCanvasSize = (canvas: HTMLCanvasElement, width: number, height: number) => {
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

export const LayoutGuidesLayer = (props: LayoutGuidesLayerProps) => {
  const { viewer } = props;

  const selection = useReconstructionStore(state => state.selection);
  const selectedItem = props.layout.items.find(item =>
    item.reconstructionCanvasId === selection[0]?.id);

  // HTML Canvas elements
  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const foregroundRef = useRef<HTMLCanvasElement>(null);

  // Draw loop function
  const drawRef = useRef<() => void>(() => {});

  const drawCanvasOutlines = useCanvasOutlines({
    layout: props.layout,
    visibleIds: props.visibleIds,
    drawRef
  });

  const drawScaleGrid = useScaleGrid(
    props.layout.gridScale,
    { x: selectedItem?.x ?? 0, y: selectedItem?.y ?? 0 },
    props.showGridLabels ?? false
  );

  useEffect(() => {
    const backgroundCanvas = backgroundRef.current;
    const foregroundCanvas = foregroundRef.current;
    if (!backgroundCanvas || !foregroundCanvas) return;

    const backgroundContext = backgroundCanvas.getContext('2d');
    const foregroundContext = foregroundCanvas.getContext('2d');
    if (!backgroundContext || !foregroundContext) return;

    const containerSize = { x: 0, y: 0 };

    // Render loop function
    const draw = () => {
      const bounds = viewer.viewport.getBounds(true);

      const scaleX = containerSize.x / bounds.width;
      const scaleY = containerSize.y / bounds.height;
      if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY)) return;

      backgroundContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      backgroundContext.clearRect(0, 0, containerSize.x, containerSize.y);

      foregroundContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      foregroundContext.clearRect(0, 0, containerSize.x, containerSize.y);

      drawScaleGrid(backgroundContext, foregroundContext, bounds, scaleX, scaleY);
      drawCanvasOutlines(backgroundContext, foregroundContext, bounds, scaleX, scaleY);
    }

    const onResize = (entries: ResizeObserverEntry[]) => {
      const { width, height } = entries[0].contentRect;

      containerSize.x = width;
      containerSize.y = height;

      setCanvasSize(backgroundCanvas, width, height);
      setCanvasSize(foregroundCanvas, width, height);

      draw();
    }

    drawRef.current = draw;

    const { x, y } = viewer.viewport.getContainerSize();
    containerSize.x = x;
    containerSize.y = y;

    setCanvasSize(backgroundCanvas, x, y);
    setCanvasSize(foregroundCanvas, x, y);
    draw();

    viewer.addHandler('update-viewport', draw);

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(viewer.container);

    return () => {
      viewer.removeHandler('update-viewport', draw);
      resizeObserver.disconnect();
      drawRef.current = () => {};
    };
  }, [viewer, drawScaleGrid, drawCanvasOutlines]);

  return (
    <>
      <canvas ref={backgroundRef} className="absolute inset-0 size-full pointer-events-none z-0" />
      <canvas ref={foregroundRef} className="absolute inset-0 size-full pointer-events-none z-40" />
    </>
  )

}
