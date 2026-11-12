import { createContext, useContext, useEffect, useRef, useState } from 'react';
import OpenSeadragon from 'openseadragon';
import type { CozyImageResource } from 'cozy-iiif';
import { MeasurementTool } from '@/dialogs/physical-dimensions';
import { useSourceNavigation } from '../use-source-navigation';
import { SourcePreviewControls } from './source-preview-controls';
import { SourcePreviewToolbar } from './source-preview-toolbar';
import { ViewerSvgOverlay } from '@/components/viewer-svg-overlay';

const ViewerContext = createContext<OpenSeadragon.Viewer | null>(null);

export const useViewer = () => useContext(ViewerContext);

interface SourcePreviewProps {

  isInspectorOpen: boolean;

  setInspectorOpen(open: boolean): void;

}

export const SourcePreview = (props: SourcePreviewProps) => {
  const elementRef = useRef<HTMLDivElement>(null);

  const [viewer, setViewer] = useState<OpenSeadragon.Viewer | null>(null);

  const { 
    selectedCanvas,
    selectedManifest,
    isInReconstruction,
    selectNext,
    selectPrevious,
    currentSelectedIndex,
    visibleCanvases
  } = useSourceNavigation();

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    // react-resizable-panel expands each Separator's drag hit target a few
    // pixels into neighboring Panel content, and only calls preventDefault()
    // when a pointerdown starts a resize there. That interferes with OSD!
    // Listening in the capture phase lets us detect that the drag
    // was claimed and stop it from reaching OSD at all.
    const onPointerDownCapture = (e: PointerEvent) => {
      if (e.defaultPrevented) 
        e.stopPropagation();
    }

    el.addEventListener('pointerdown', onPointerDownCapture, true);
    return () => el.removeEventListener('pointerdown', onPointerDownCapture, true);
  }, []);

  useEffect(() => {
    if (!elementRef.current) return;

    const v = OpenSeadragon({
      element: elementRef.current,
      showNavigationControl: false,
      maxZoomPixelRatio: Infinity,
      minZoomImageRatio: 0,
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
    if (!viewer || !selectedCanvas) return;

    // Guards against a superseded fitBounds after fast next/prev navigation
    let cancelled = false;

    const addImage = (image: CozyImageResource) => new Promise<void>(resolve => {
      const tileSource = image.type === 'dynamic' || image.type === 'level0'
        ? image.serviceUrl
        : image.url;

      if (image.target) {
        const x = image.target.x / selectedCanvas!.width;
        const y = image.target.y / selectedCanvas!.width;
        const width = image.target.w / selectedCanvas!.width;

        viewer.addTiledImage({
          tileSource,
          x,
          y,
          width,
          success: () => resolve()
        });
      } else {
        viewer.addTiledImage({ tileSource, success: () => resolve() });
      }
    });

    Promise.all(selectedCanvas.images.map(addImage)).then(() => {
      if (cancelled) return;

      const aspectRatio = selectedCanvas!.width / selectedCanvas!.height;
      const canvasRect = new OpenSeadragon.Rect(-0.15, -0.05, 1.3, 1.25 / aspectRatio);
      viewer.viewport.fitBounds(canvasRect, true);
    });

    return () => {
      cancelled = true;
      viewer.world.removeAll();
    }
  }, [viewer, selectedCanvas]);

  return (
    <ViewerContext.Provider value={viewer}>
      <div 
        className="size-full relative [&>.openseadragon-container]:z-10 
          shadow-[inset_0_0_40px_-5px_rgba(0,0,0,0.06)] bg-[radial-gradient(#e0e0e0_1px,transparent_1px)] bg-size-[16px_16px]">
        <div 
          ref={elementRef} 
          className="size-full"
          tabIndex={-1}>
          <ViewerSvgOverlay
            viewer={viewer}
            topLayer={(
              <MeasurementTool viewer={viewer} />
            )} />
        </div>

        <SourcePreviewControls 
          isInspectorOpen={props.isInspectorOpen} 
          onChangeInspectorOpen={props.setInspectorOpen} />

        {(selectedManifest && selectedCanvas) && (
          <SourcePreviewToolbar 
            isInReconstruction={isInReconstruction(selectedManifest.id, selectedCanvas.id)}
            selectedCanvas={selectedCanvas}
            selectedManifest={selectedManifest} 
            selectedPageIndex={currentSelectedIndex}
            totalPageCount={visibleCanvases.length}
            onNext={selectNext} 
            onPrevious={selectPrevious} />
        )}
      </div>
    </ViewerContext.Provider>
  )

}