import { useLayoutEffect, type RefObject } from 'react';
import { Point, type Viewer } from 'openseadragon';
import type { ComposerLayoutItem } from "../../reconstruction-types";

export const getScreenScale = (viewer: Viewer, item: ComposerLayoutItem, canvasWidth: number) => {
  const left = viewer.viewport.pixelFromPoint(new Point(item.x, item.y), true);
  const right = viewer.viewport.pixelFromPoint(new Point(item.x + item.width, item.y), true);
 
  return (right.x - left.x) / canvasWidth;
}

export const useItemTransform = (
  viewer: Viewer,
  item: ComposerLayoutItem,
  canvasWidth: number,
  ref: RefObject<HTMLElement | null>
) => {
  
  useLayoutEffect(() => {
    const update = () => {
      const el = ref.current;
      if (!el) return;
 
      const origin = viewer.viewport.pixelFromPoint(new Point(item.x, item.y), true);
      const scale = getScreenScale(viewer, item, canvasWidth);
 
      el.style.transform = `translate(${origin.x}px, ${origin.y}px) scale(${scale})`;
      el.style.setProperty('--osd-scale', String(scale));
    };
 
    update();
 
    viewer.addHandler('update-viewport', update);
 
    return () => {
      viewer.removeHandler('update-viewport', update);
    };
  }, [viewer, ref, item.x, item.y, item.width, canvasWidth]);

}