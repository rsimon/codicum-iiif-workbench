import type { Bounds, CozyImageResource } from 'cozy-iiif';
import type { PhysicalScale } from '@/types';

export interface ComposerLayout {

  items: ComposerLayoutItem[];

  gridScale: GridScale;

  layoutWidth: number;

  layoutHeight: number;

}

export type GridScale =
  | { type: 'physical' } & PhysicalScale
  | { type: 'pixels'; unit: 'px'; unitsPerOSDUnit: number };

export interface ComposerLayoutItem {

  reconstructionCanvasId: string;

  x: number; 
  
  y: number; 
  
  width: number; 
  
  height: number;

}

export interface DraggableImage {

  sourceCanvasId: string;

  sourceCanvasInstanceId: string;

  resource: CozyImageResource;

  tileSource: object | string;

  x: number; // px coordinates relative to reconstruction canvas

  y: number; // px coordinates relative to reconstruction canvas

  width: number; // px coordinates relative to reconstruction canvas

  crop?: Bounds;

  index: number;

}

export interface DraggableImageSelection {

  image: DraggableImage;

  item: ComposerLayoutItem;

  // Images can only be associated with a different item
  // if they are the only image on the source canvas - in 
  // other words: source canvases are always treated as a 
  // unit, and it's not possible to "split" them.
  canChangeItem: boolean;

}

export interface TextAnnotationSelection {

  canvasId: string;

  annotationId: string;

}
