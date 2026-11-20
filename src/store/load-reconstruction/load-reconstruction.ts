import { generateJSON } from '@tiptap/react';
import { EDITOR_EXTENSIONS } from '@/components/tiptap-editor';
import { parseCanvas } from '@/store/app-store-utils';
import { 
  Cozy, 
  type CozyCanvas, 
  type CozyImageResource, 
  type CozyManifest, 
  type CozyParseResult
} from 'cozy-iiif';
import type {
  PhysicalSize, 
  ReconstructionCanvas, 
  SourceCanvas, 
  SourceManifest,
  TextAnnotation
} from '@/types';

export const LOAD_RECONSTRUCTION_ERROR_TYPES = [
  'MANIFEST_LOAD_FAILED',
  'MANIFEST_PARSE_FAILED',
  'NOT_A_PRESENTATION_MANIFEST',
  'NOT_A_RECONSTRUCTION',
  'INVALID_RECONSTRUCTION'
] as const;

export type LoadReconstructionErrorType = typeof LOAD_RECONSTRUCTION_ERROR_TYPES[number];

export interface LoadReconstructionError {

  type: LoadReconstructionErrorType;

  message: string;
}

export class ReconstructionLoadError extends Error implements LoadReconstructionError {

  public readonly type: LoadReconstructionErrorType;

  constructor(
    type: LoadReconstructionErrorType,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.type = type;
    this.name = 'ReconstructionLoadError';
  }
}

export const isLoadReconstructionError = (error: unknown): error is ReconstructionLoadError =>
  error instanceof ReconstructionLoadError;

export interface ReconstructionParseResult {

  sources: SourceManifest[];

  reconstruction: ReconstructionCanvas[];

}

const parsePhysicalSize = (canvas: CozyCanvas): PhysicalSize | undefined => {
  const services = 
    Array.isArray(canvas.source.service) ? canvas.source.service : 
    canvas.source.service ? [canvas.source.service] :
    [];

  const physDimService = services.find(s => s.profile === 'http://iiif.io/api/annex/services/physdim');
  if (!physDimService) return;

  try {
    const physicalScale = parseFloat((physDimService as any).physicalScale);
    const unit = (physDimService as any).physicalUnits;

    if (isNaN(physicalScale))
      throw new Error(`Could not parse scale: ${(physDimService as any).physicalScale}`);

    if (!unit)
      throw new Error(`Physical units missing`);

    const width = Math.round(100 * canvas.width * physicalScale) / 100;
    const height = Math.round(100 * canvas.height * physicalScale) / 100;
    return { width, height, unit };
  } catch (error) {
    console.error(error);
    console.warn(physDimService);
    console.warn('Error parsing physical size');
  }
}

const parseTextAnnotations = (canvas: CozyCanvas): TextAnnotation[] => {
  type RawAnnotation = {
    id?: unknown;
    body?: unknown;
    target?: unknown;
  };

  type RawPage = { items?: unknown };
  const pages = canvas.annotations as unknown as RawPage[];

  const parseTarget = (target: unknown): { x: number; y: number; width: number; height: number } | undefined => {
    if (Array.isArray(target))
      return target.map(parseTarget).find(Boolean);

    if (typeof target === 'string') {
      const match = target.match(/xywh=(?:pixel:)?(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)/);
      return match ? {
        x: Number(match[1]),
        y: Number(match[2]),
        width: Number(match[3]),
        height: Number(match[4])
      } : undefined;
    }

    if (!target || typeof target !== 'object') return undefined;

    const candidate = target as {
      id?: unknown;
      source?: unknown;
      selector?: unknown;
    };
    const selector = candidate.selector;
    if (selector && typeof selector === 'object') {
      const value = (selector as { value?: unknown }).value;
      if (typeof value === 'string') return parseTarget(value);
    }

    return parseTarget(candidate.id) ?? parseTarget(candidate.source);
  }

  return pages.flatMap(page => {
    const items = Array.isArray(page.items) ? page.items as RawAnnotation[] : [];
    return items.flatMap(annotation => {
      if (!annotation || typeof annotation !== 'object') return [];

      const body = annotation.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) return [];

      const textBody = body as { type?: unknown; value?: unknown };
      if (textBody.type !== 'TextualBody' || typeof textBody.value !== 'string')
        return [];

      const bounds = parseTarget(annotation.target);
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) return [];

      return [{
        id: typeof annotation.id === 'string' ? annotation.id : crypto.randomUUID(),
        content: generateJSON(textBody.value, EDITOR_EXTENSIONS),
        // TODO this is our default size... how to store that in the annotation?
        fontSize: Math.round(canvas.width * 0.02),
        ...bounds
      }];
    });
  });
}

const parseReconstructionManifest = async (manifest: CozyManifest): Promise<ReconstructionParseResult> => {
  // Parse list of source manifests
  const field = (manifest.source.metadata || []).find(m => {
    // Brittle... perhaps we can find a more robust way to encode this in the future
    const isManifestsField = 
      Array.isArray(m.label?.en) && 
      m.label.en[0] === 'Source Manifests' &&
      Array.isArray(m.value?.en) &&
      m.value.en.length > 0 &&
      m.value.en.every(url => typeof url === 'string' && url.startsWith('http'));

    return isManifestsField;
  });

  if (!field)
    throw new ReconstructionLoadError('NOT_A_RECONSTRUCTION', 'Not a reconstruction');

  // Fetch source manifests
  const sourceManifestURLs = field.value.en?.filter(Boolean).flatMap(str => str.split(',')) as string[];

  const sources = await sourceManifestURLs.reduce<Promise<SourceManifest[]>>((p, url) => p.then(sources => {
    return Cozy.parseURL(url).then(result => {
      if (result.type !== 'manifest') {
        const message = result.type === 'error'
          ? result.message
          : `Could not fetch manifest ${url}`;
        
        throw new ReconstructionLoadError(
          'MANIFEST_LOAD_FAILED',
          `Could not load source manifest ${url}: ${message}`
        );
      }

      return [...sources, { manifest: result.resource, url }];
    }).catch(error => {
      if (isLoadReconstructionError(error))
        throw error;

      throw new ReconstructionLoadError(
        'MANIFEST_LOAD_FAILED',
        `Could not load source manifest ${url}`,
        { cause: error }
      );
    });
  }), Promise.resolve([]));

  // Based on a CozyCanvas from the imported project manifest, WITH MULTIPLE IMAGES,
  // this function creates the list of `SourceCanvas` objects, by:
  // - Identfying which source canvases the images belong to
  // - Re-grouping them accordingly
  // - Regenerating the SourceCanvas list, with images and targets 
  const regenerateSourceCanvases = (canvas: CozyCanvas): SourceCanvas[] => {
    const getIdentifier = (img: CozyImageResource) =>
      img.type === 'static' ? img.url : img.serviceUrl;

    // The export flattens all source canvases into one canvas. Group the
    // exported images back by the resolved source canvas they came from.
    const groups: {
      source: SourceCanvas;
      images: CozyImageResource[]
    }[] = [];

    canvas.images.forEach(image => {
      const imageId = getIdentifier(image);

      const source = sources.reduce<SourceCanvas | undefined>((found, sourceManifest) => {
        if (found) return found;

        const sourceCanvas = sourceManifest.manifest.canvases.find(sourceCanvas =>
          sourceCanvas.images.some(sourceImage => getIdentifier(sourceImage) === imageId));

        return sourceCanvas
          ? { sourceManifestId: sourceManifest.manifest.id, canvas: sourceCanvas, instanceId: crypto.randomUUID() }
          : undefined;
      }, undefined);

      if (!source) return;

      // Not ideal - but holds under the assumption that imported sources
      // are manifests with single-image canvases
      groups.push({ source, images: [image]});
    });

    return groups.map(({ source, images }) => {
      const sourceCanvas = {
        ...source.canvas.source,
        items: (source.canvas.source.items || []).map(page => ({
          ...page,
          items: images.map(image => ({
            type: 'Annotation',
            body: image.source,
            target: image.target ? `${canvas.id}#xywh=${image.target.x},${image.target.y},${image.target.w},${image.target.h}` : canvas.id
          }))
        }))
      };

      return {
        ...source,
        canvas: parseCanvas(sourceCanvas)
      };
    });
  }

  // Compile reconstruction canvases
  const reconstruction: Partial<ReconstructionCanvas>[] = manifest.canvases.map(canvas => {
    if (canvas.images.length === 1) {
      const physicalSize = parsePhysicalSize(canvas);
      return {
        type: 'original',
        id: canvas.id,
        label: canvas.getLabel(),
        height: canvas.height,
        width: canvas.width,
        source: regenerateSourceCanvases(canvas)[0],
        annotations: parseTextAnnotations(canvas),
        physicalSize
      }
    } else {
      return {
        type: 'composite',
        id: canvas.id,
        label: canvas.getLabel(),
        height: canvas.height,
        width: canvas.width,
        sources: regenerateSourceCanvases(canvas),
        annotations: parseTextAnnotations(canvas),
        physicalSize: parsePhysicalSize(canvas)
      }
    }
  });

  if (reconstruction.some(rc => rc.type === 'original' && !rc.source))
    throw new ReconstructionLoadError(
      'INVALID_RECONSTRUCTION',
      'Could not match an original canvas to its source manifest'
    );

  return {
    sources,
    reconstruction: reconstruction as ReconstructionCanvas[]
  };
}

const loadResult = async (result: CozyParseResult, fromURL: boolean): Promise<ReconstructionParseResult> => {
  if (result.type === 'error') {
    throw new ReconstructionLoadError(
      fromURL ? 'MANIFEST_LOAD_FAILED' : 'MANIFEST_PARSE_FAILED',
      result.message
    );
  }

  if (result.type !== 'manifest')
    throw new ReconstructionLoadError(
      'NOT_A_PRESENTATION_MANIFEST',
      'Not a presentation manifest'
    );

  try {
    return await parseReconstructionManifest(result.resource);
  } catch (error) {
    if (isLoadReconstructionError(error))
      throw error;

    throw new ReconstructionLoadError(
      'MANIFEST_PARSE_FAILED',
      error instanceof Error ? error.message : 'Could not parse reconstruction manifest',
      { cause: error }
    );
  }
}

export const loadReconstructionFromURL = async (url: string): Promise<ReconstructionParseResult> => {
  let result: CozyParseResult;
  try {
    result = await Cozy.parseURL(url);
  } catch (error) {
    throw new ReconstructionLoadError(
      'MANIFEST_LOAD_FAILED',
      `Could not load manifest ${url}`,
      { cause: error }
    );
  }
  return loadResult(result, true);
}

export const loadReconstructionFromJSON = (json: unknown): Promise<ReconstructionParseResult> => {
  try {
    return loadResult(Cozy.parse(json), false);
  } catch (error) {
    if (isLoadReconstructionError(error))
      throw error;

    throw new ReconstructionLoadError(
      'MANIFEST_PARSE_FAILED',
      error instanceof Error ? error.message : 'Could not parse manifest JSON',
      { cause: error }
    );
  }
}
