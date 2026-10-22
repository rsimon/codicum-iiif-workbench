import { generateHTML } from '@tiptap/react';
import { SCHEMA_EXTENSIONS } from '@/components/tiptap-editor';
import type { ReconstructionCanvas, SourceManifest } from '@/types';

export const createManifest = (
  label: string,
  summary: string,
  attribution: string,
  sources: SourceManifest[],
  reconstruction: ReconstructionCanvas[],
  baseURI: string
) => {
  return {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    type: 'Manifest',
    id: baseURI,
    label: {
      en: [label]
    },
    summary: {
      en: [summary]
    },
    requiredStatement: {
      label: { en: [ 'Attribution' ]},
      value: { en: [ attribution ]}
    },
    metadata: [
      {
        label: { en: ['Created' ]},
        value: { en: [ new Date().toISOString() ]},
      },
      {
        label: { en: ['Source Manifests']},
        value: { en: [sources.map(s => s.url).join(', ')]},
      },
    ],
    items: reconstruction.map(toCanvasItem)
  }
}

const toCanvasItem = (r: ReconstructionCanvas) => {
  const { width, height } = r;

  const annotations = (r.annotations ?? []);

  // https://iiif.io/api/annex/services/#physical-dimensions
  const physdim = r.physicalSize ? {
    service: {
      '@context': 'http://iiif.io/api/annex/services/physdim/1/context.json',
      profile: 'http://iiif.io/api/annex/services/physdim',
      physicalScale: r.physicalSize.width / width,
      physicalUnits: r.physicalSize.unit
    }
  } : {};

  const sources = r.type === 'original' ? [r.source] : r.sources;

  return {
    id: r.id,
    type: 'Canvas',
    label: { en: [ r.label ] },
    width,
    height,
    ...physdim,
    items: sources.length === 0 ? [] :[{
      id: `${r.id}/page/1`,
      type: 'AnnotationPage',
      items: sources.flatMap(sc => sc.canvas.images.map(image => ({
        id: `${r.id}/annotation/${crypto.randomUUID()}`,
        type: 'Annotation',
        motivation: 'painting',
        body: image.source,
        target: image.target 
          ? `${r.id}#xywh=${Math.round(image.target.x)},${Math.round(image.target.y)},${Math.round(image.target.w)},${Math.round(image.target.h)}`
          : r.id
      })))
    }],
    ...(annotations.length > 0 ? {
      annotations: [{
          id: `${r.id}/annotations/page/1`,
          type: 'AnnotationPage',
          items: annotations.map(annotation => ({
            id: `${r.id}/annotation/${annotation.id}`,
            type: 'Annotation',
            motivation: 'commenting',
            body: {
              type: 'TextualBody',
              value: generateHTML(annotation.content, SCHEMA_EXTENSIONS),
              format: 'text/plain'
            },
            target: {
              type: 'SpecificResource',
              source: r.id,
              selector: {
                type: 'FragmentSelector',
                conformsTo: 'http://www.w3.org/TR/media-frags/',
                value: `xywh=pixel:${Math.round(annotation.x)},${Math.round(annotation.y)},${Math.round(annotation.width)},${Math.round(annotation.height)}`
              }
            }
          }))
      }]
    } : {})
  };
}
