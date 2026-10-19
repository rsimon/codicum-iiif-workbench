import type { PointerEvent } from 'react';
import { Point, Viewer } from 'openseadragon';
import type { ReconstructionCanvas } from '@/types';
import type {  ComposerLayoutItem, DraggableImage, DraggableImageSelection } from '../../reconstruction-types';
import type { CornerHandleType } from './corner-handle';
import type { EdgeHandleType } from './edge-handle';

// Initial image state at drag start
export interface InitialShape {

  image: DraggableImage;

  item: ComposerLayoutItem;

  canvas: ReconstructionCanvas;

  // Image initial position, OSD viewport coordinates
  initialViewportPos: {

    x: number;

    y: number;

    width: number;

  }

}

export type ResizeHandleType = CornerHandleType | EdgeHandleType;

export const HANDLE_TYPES: CornerHandleType[] = [
  'TOP_LEFT',
  'TOP_RIGHT',
  'BOTTOM_RIGHT',
  'BOTTOM_LEFT'
];

/**
 * Sign of each handle's effect on the image's x/y position as it's resized:
 * +1 keeps the opposite (min) edge anchored, -1 keeps the opposite (max)
 * edge anchored, 0 means this axis isn't driven by that handle at all.
 */
export const RESIZE_SIGNS: Record<ResizeHandleType, { h: number; v: number }> = {
  TOP_LEFT: { h: -1, v: -1 },
  TOP: { h: 0, v: -1 },
  TOP_RIGHT: { h: 1, v: -1 },
  RIGHT: { h: 1, v: 0 },
  BOTTOM_RIGHT: { h: 1, v: 1 },
  BOTTOM: { h: 0, v: 1 },
  BOTTOM_LEFT: { h: -1, v: 1 },
  LEFT: { h: -1, v: 0 }
};

/**
 * Returns list of corner points, OSD viewport coordinates. Optionally
 * supports "overrides" for image position, in case image corners should
 * be computed from live data, before Zustand state has updated.
 */
export const getImageCorners = (selected: DraggableImageSelection, canvasWidth: number, ox?: number, oy?: number, ow?: number): Point[] => {
  const { image, item } = selected;

  const crop = image.crop ?? {
    x: 0,
    y: 0,
    w: image.resource.width,
    h: image.resource.height
  };

  const aspect = crop.w / crop.h;
  const canvasScale = item.width / canvasWidth;
  const x = item.x + (ox ?? image.x) * canvasScale;
  const y = item.y + (oy ?? image.y) * canvasScale;
  const w = (ow ?? image.width) * canvasScale;
  const h = w / aspect;

  return [
    new Point(x, y),
    new Point(x + w, y),
    new Point(x + w, y + h),
    new Point(x, y + h)
  ];
}

export const cornersToSvgPoints = (corners: Point[]): string =>
  corners.map(p => `${p.x},${p.y}`).join(' ');

export const getPoint = (evt: PointerEvent, viewer: Viewer) => {
  const { x, y } = viewer.element.getBoundingClientRect();

  const { clientX, clientY } = evt;
  const offsetX = clientX - x;
  const offsetY = clientY - y;

  return viewer.viewport.pointFromPixel(new Point(offsetX, offsetY));
}