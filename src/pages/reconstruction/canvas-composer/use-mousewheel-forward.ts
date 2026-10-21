import { useEffect } from 'react';
import type { Viewer } from 'openseadragon';

export const useMousewheelForward = (el: HTMLElement | SVGElement | null, viewer: Viewer) => {

  useEffect(() => {
    const viewerCanvas = viewer.canvas;
    if (!el || !viewerCanvas) return;

    const onWheel: EventListener = e => {
      const evt = e as WheelEvent;

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
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [el, viewer]);
  
}