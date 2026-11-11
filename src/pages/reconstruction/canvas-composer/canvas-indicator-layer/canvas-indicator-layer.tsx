import { useEffect, useRef } from 'react';
import type { Viewer } from 'openseadragon';
import { useReconstructionStore } from '../../reconstruction-store';
import type { ComposerLayout } from '../../reconstruction-types';
import { useCanvasIndicators } from './use-canvas-indicators';
import { useScaleGrid } from './use-scale-grid';

interface CanvasIndicatorLayerProps {

  viewer: Viewer;

  layout: ComposerLayout;

  visibleIds: Set<string>;

  showGridLabels?: boolean;

}

export const CanvasIndicatorLayer = (props: CanvasIndicatorLayerProps) => {
  const { viewer } = props;
  const drawRef = useRef<() => void>(() => {});
  const selection = useReconstructionStore(state => state.selection);
  const selectedItem = props.layout.items.find(item =>
    item.reconstructionCanvasId === selection[0]?.id
  );
  const drawScaleGrid = useScaleGrid(
    props.layout.gridScale,
    { x: selectedItem?.x ?? 0, y: selectedItem?.y ?? 0 },
    props.showGridLabels ?? false
  );
  const drawIndicators = useCanvasIndicators({
    layout: props.layout,
    visibleIds: props.visibleIds,
    drawRef
  });

  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const foregroundRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const backgroundCanvas = backgroundRef.current;
    const foregroundCanvas = foregroundRef.current;
    if (!backgroundCanvas || !foregroundCanvas) return;

    const backgroundContext = backgroundCanvas.getContext('2d');
    const foregroundContext = foregroundCanvas.getContext('2d');
    if (!backgroundContext || !foregroundContext) return;

    const dpr = window.devicePixelRatio || 1;
    const containerSize = { x: 0, y: 0 };

    const sizeCanvas = (canvas: HTMLCanvasElement, width: number, height: number) => {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

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
      drawIndicators(backgroundContext, foregroundContext, bounds, scaleX, scaleY);
    }

    const onResize = (entries: ResizeObserverEntry[]) => {
      const { width, height } = entries[0].contentRect;

      containerSize.x = width;
      containerSize.y = height;
      sizeCanvas(backgroundCanvas, width, height);
      sizeCanvas(foregroundCanvas, width, height);
      draw();
    }

    drawRef.current = draw;

    const { x, y } = viewer.viewport.getContainerSize();
    containerSize.x = x;
    containerSize.y = y;
    sizeCanvas(backgroundCanvas, x, y);
    sizeCanvas(foregroundCanvas, x, y);
    draw();

    viewer.addHandler('update-viewport', draw);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(viewer.container);

    return () => {
      viewer.removeHandler('update-viewport', draw);
      resizeObserver.disconnect();
      drawRef.current = () => {};
    };
  }, [viewer, drawScaleGrid, drawIndicators]);

  return (
    <>
      <canvas ref={backgroundRef} className="absolute inset-0 size-full pointer-events-none z-0" />
      <canvas ref={foregroundRef} className="absolute inset-0 size-full pointer-events-none z-40" />
    </>
  );
}
