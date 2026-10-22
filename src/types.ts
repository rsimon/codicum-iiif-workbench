import type { JSONContent  } from '@tiptap/react';
import type { CozyCanvas, CozyManifest } from 'cozy-iiif';

/** Sources **/

export interface SourceManifest {

  url: string;
  
  manifest: CozyManifest;

}

export interface SourceCanvas {

  instanceId: string;

  sourceManifestId: string;

  canvas: CozyCanvas;

  physicalSize?: PhysicalSize;

}

export interface PhysicalSize {

  width: number;

  height: number;

  unit: string;

}

export interface PhysicalScale {

  unit: string;

  physicalUnitsPerOSDUnit: number;

}


export interface TextAnnotation {

  id: string;

  x: number;

  y: number;

  width: number;

  height: number;

  fontSize: number;

  content: JSONContent;

}

/** Reconstruction **/

export interface OriginalCanvas {

  type: 'original';

  id: string;

  label: string;

  source: SourceCanvas;

  width: number;

  height: number;

  physicalSize?: PhysicalSize;

  annotations?: TextAnnotation[];

}

export interface CompositeCanvas {

  type: 'composite';

  id: string;

  label: string;

  sources: SourceCanvas[];

  width: number;

  height: number;

  physicalSize?: PhysicalSize;

  annotations?: TextAnnotation[];

}

export type ReconstructionCanvas = 
  | OriginalCanvas 
  | CompositeCanvas;