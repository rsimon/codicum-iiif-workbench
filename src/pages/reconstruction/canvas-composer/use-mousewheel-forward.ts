import { useEffect, type RefObject } from 'react';
import type { Viewer } from 'openseadragon';

export const useMousewheelForward = (ref: RefObject<HTMLElement | null>, viewer: Viewer) => {

  useEffect(() => {
    const element = ref.current;
    const viewerCanvas = viewer.canvas;
    if (!element || !viewerCanvas) return;

    const onWheel = (evt: WheelEvent) => {
      evt.preventDefault();
      evt.stopPropagation();

      // Re-create and dispatch native wheel event to OSD
      const wheelEvent = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX: evt.clientX,
        clientY: evt.clientY,
        deltaX: evt.deltaX,
        deltaY: evt.deltaY,
        deltaZ: evt.deltaZ,
        deltaMode: evt.deltaMode,
        ctrlKey: evt.ctrlKey,
        shiftKey: evt.shiftKey,
        altKey: evt.altKey,
        metaKey: evt.metaKey,
      });

      viewerCanvas.dispatchEvent(wheelEvent);
    };

    // Attach native listener with passive: false to enable preventDefault()
    element.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', onWheel);
    };
  }, [ref, viewer]);
  
}