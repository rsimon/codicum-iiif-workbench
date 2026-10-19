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

/** Reconstruction **/

export interface OriginalCanvas {

  type: 'original';

  id: string;

  label: string;

  source: SourceCanvas;

  width: number;

  height: number;

  physicalSize?: PhysicalSize;

}

export interface CompositeCanvas {

  type: 'composite';

  id: string;

  label: string;

  sources: SourceCanvas[];

  width: number;

  height: number;

  physicalSize?: PhysicalSize;

}

export type ReconstructionCanvas = 
  | OriginalCanvas 
  | CompositeCanvas;