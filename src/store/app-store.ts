import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CozyCanvas, CozyManifest } from 'cozy-iiif';
import type { PhysicalSize, ReconstructionCanvas, SourceManifest } from '@/types';
import {
  appendEmptyCanvas,
  insertCanvasesAtIndex,
  mergeInto,
  moveCanvas,
  parseCanvas,
  parseManifest,
  removeCanvasFromReconstruction,
  removeSourceCanvasFromReconstruction
} from './app-store-utils';

interface AppStore {

  baseURI: string;

  sources: SourceManifest[];

  // Physical sizes by canvas ID
  sizes: Map<string, PhysicalSize>;

  reconstruction: ReconstructionCanvas[];

  // Actions: sources
  addSource: (url: string, manifest: CozyManifest) => void;
  addSourceCanvasToReconstruction: (sourceId: string, canvas: CozyCanvas) => void;
  addSourceCanvasesToReconstruction: (sources: { sourceId: string, canvas: CozyCanvas}[]) => void;
  removeAllSources: () => void;
  removeSource: (manifestId: string) => void;
  removeSourceCanvasFromReconstruction: (sourceId: string) => void;
  removeSourceCanvasesFromReconstruction: (sourceIds: string[]) => void;

  // Actions: reconstruction
  appendEmptyCanvas: (width?: number, height?: number) => void;
  duplicateCanvas: (canvasId: string) => void;
  insertCanvasesAtIndex: (canvasIds: string[], index: number) => void;
  mergeCanvases: (toMerge: ReconstructionCanvas[]) => void;
  moveCanvas: (canvasId: string, direction: MoveDirection) => void;
  removeCanvasFromReconstruction: (canvasId: string) => void;
  removeCanvasesFromReconstruction: (canvasIds: string[]) => void;
  renameCanvas: (canvasId: string, label: string) => void;
  resizeCanvas: (canvasId: string, width: number, height: number) => void;
  updateReconstruction: (updated: ReconstructionCanvas[]) => void;

  // Actions: combined
  setSourcePhysicalSize: (sourceId: string, size?: PhysicalSize) => void;
  setReconstructionPhysicalSize: (canvasId: string, size?: PhysicalSize) => void;
  resetAll: () => void;
  loadProject: (sources: SourceManifest[], reconstruction: ReconstructionCanvas[]) => void;

}

export type MoveDirection = 'up' | 'down' | 'top' | 'bottom';

export const useAppStore = create<AppStore>()(
  persist(
    set => ({

      baseURI: `${window.location.origin}/manifest/0001`,
    
      sources: [],

      reconstruction: [],

      sizes: new Map(),

      addSource: (url, manifest) => set(({ sources }) => {
        // Check if already added
        if (sources.some(s => s.url === url)) return {};
        return {
          sources: [...sources, { url, manifest }]
        };
      }),

      addSourceCanvasToReconstruction: (sourceId, canvas) => set(({ reconstruction, sizes, baseURI }) => {
        // Don't re-add
        if (reconstruction.find(r => r.id === canvas.id)) return {};

        return {
          reconstruction: [
            ...reconstruction, 
            {
              type: 'original',
              // Even 'original' canvases get a new ID assigned, so we a) can 
              // easily support duplicate imports, b) are not sloppy regarding
              // the semantics of the ID (we are creating a derivative after all!)
              id: `${baseURI}/canvas/${crypto.randomUUID()}`,
              label: canvas.getLabel(),
              width: canvas.width,
              height: canvas.height,
              source: {
                instanceId: crypto.randomUUID(),
                sourceManifestId: sourceId,
                canvas,
                physicalSize: sizes.get(canvas.id)
              }
            }
          ]
        };
      }),

      addSourceCanvasesToReconstruction: sources => set(({ reconstruction, sizes, baseURI }) => {
        const toAdd = sources.filter(s => !reconstruction.some(r => r.id === s.canvas.id));
        if (toAdd.length === 0) return {};

        return {
          reconstruction: [
            ...reconstruction,
            ...toAdd.map(s => ({
              type: 'original' as const,
              id: `${baseURI}/canvas/${crypto.randomUUID()}`,
              label: s.canvas.getLabel(),
              width: s.canvas.width,
              height: s.canvas.height,
              source: {
                instanceId: crypto.randomUUID(),
                sourceManifestId: s.sourceId,
                canvas: s.canvas,
                physicalSize: sizes.get(s.canvas.id)
              }
            }))
          ]
        }
      }),

      removeAllSources: () => set({ sources: [] }),

      removeSource: manifestId => set(({ sources }) => ({
        sources: sources.filter(s => s.manifest.id !== manifestId)
      })),

      removeSourceCanvasFromReconstruction: (sourceId: string) => set(({ reconstruction }) => ({
        reconstruction: removeSourceCanvasFromReconstruction(reconstruction, sourceId)
      })),

      removeSourceCanvasesFromReconstruction: (sourceIds: string[]) => set(({ reconstruction }) => ({
        reconstruction: removeSourceCanvasFromReconstruction(reconstruction, sourceIds)
      })),

      appendEmptyCanvas: (fallbackWidth = 2000, fallbackHeight = 3000) => set(({ baseURI, reconstruction }) => ({
        reconstruction: appendEmptyCanvas(reconstruction, baseURI, fallbackWidth, fallbackHeight)
      })),

      duplicateCanvas: canvasId => set(({ reconstruction, baseURI }) => {
        const index = reconstruction.findIndex(c => c.id === canvasId);
        if (index === -1) return {};

        const toDuplicate = reconstruction[index];

        const duplicate: ReconstructionCanvas = {
          ...toDuplicate,
          id: `${baseURI}/${crypto.randomUUID()}`,
          label: `${toDuplicate.label} (copy)`,
        };

        // Duplicates need new instance IDs for their source
        // canvases, so view transitions keep working!
        if (duplicate.type === 'original') {
          duplicate.source = {
            ...duplicate.source,
            instanceId: crypto.randomUUID()
          }
        } else {
          duplicate.sources = duplicate.sources.map(s => ({
            ...s,
            instanceId: crypto.randomUUID()
          }));
        }

        const updatedReconstruction = [...reconstruction];
        updatedReconstruction.splice(index + 1, 0, duplicate);

        return { reconstruction: updatedReconstruction };
      }),

      mergeCanvases: toMerge => set(({ baseURI, reconstruction  }) => ({
        reconstruction: mergeInto(toMerge, reconstruction, baseURI)
      })),

      insertCanvasesAtIndex: (canvasIds, index) => set(({ reconstruction }) => ({
        reconstruction: insertCanvasesAtIndex(reconstruction, canvasIds, index)
      })),

      moveCanvas: (canvasId, direction) => set(({ reconstruction }) => ({
        reconstruction: moveCanvas(reconstruction, canvasId, direction)
      })),

      removeCanvasFromReconstruction: canvasId => set(({ reconstruction }) => ({
        reconstruction: removeCanvasFromReconstruction(reconstruction, canvasId)
      })),

      removeCanvasesFromReconstruction: canvasIds => set(({ reconstruction }) => ({
        reconstruction: removeCanvasFromReconstruction(reconstruction, canvasIds)
      })),

      renameCanvas: (canvasId, label) => set(({ reconstruction }) => ({
        reconstruction: reconstruction.map(r => r.id === canvasId ? {
          ...r, label
        } : r)
      })),
      
      resizeCanvas: (canvasId, width, height) => set(({ reconstruction }) => ({
        reconstruction: reconstruction.map(r => r.id === canvasId ? { ...r, width, height } : r)
      })),

      updateReconstruction: reconstruction => set({ reconstruction }),

      setSourcePhysicalSize: (sourceCanvasId, size) => set(({ reconstruction, sizes }) => {
        // Update 'sizes' map
        const updatedSizes = new Map(sizes);
        if (size)
          updatedSizes.set(sourceCanvasId, size);
        else
          updatedSizes.delete(sourceCanvasId);

        // Traverse reconstruction and update, in case it's already added
        const updatedReconstruction = reconstruction.map(r => {
          if (r.type === 'original') {
            return r.source.canvas.id === sourceCanvasId ? {
              ...r, 
              physicalSize: size
            } : r;
          } else {
            const isAffected = r.sources.some(s => s.canvas.id === sourceCanvasId);
            return isAffected ? {
              ...r,
              sources: r.sources.map(source => source.canvas.id === sourceCanvasId ? {
                ...source,
                physicalSize: size
              } : source)
            } : r;
          }
        });

        return { sizes: updatedSizes, reconstruction: updatedReconstruction };
      }),

      setReconstructionPhysicalSize: (canvasId, size) => set(({ reconstruction }) => ({
        reconstruction: reconstruction.map(r => r.id === canvasId ? { ...r, physicalSize: size } : r)
      })),

      resetAll: () => set(() => ({
        reconstruction: [],
        sources: [],
        sizes: new Map()
      })),

      loadProject: (sources, reconstruction) => set(() => {
        // Update physical sizes map for each reconstruction canvas
        // loaded from manifest
        const sizes = new Map();

        reconstruction.forEach(rc => {
          if (rc.physicalSize) sizes.set(rc.id, rc.physicalSize)
        });
        
        return {
          sources, reconstruction, sizes
        }
      })
    }), {
      name: 'iiif-workbench-state',
      version: 2,
      storage: createJSONStorage(() => localStorage),

      partialize: state => ({
        ...state,

        sizes: Array.from(state.sizes.entries()),

        sources: state.sources.map(s => ({
          ...s,
          manifest: s.manifest.source
        })),

        reconstruction: state.reconstruction.map(r => r.type === 'original' ? {
          ...r,
          source: {
            ...r.source,
            canvas: r.source.canvas.source
          }
        } : {
          ...r,
          sources: r.sources.map(s => ({
            ...s,
            canvas: s.canvas.source
          }))
        })
      }),

      merge: (persisted: any, current: AppStore) => {
        if (!persisted) return current;

        return {
          ...current,
          ...persisted,

          sizes: new Map(persisted.sizes ?? []),

          sources: (persisted.sources ?? []).map((s: any) => ({
            url: s.url,
            manifest: parseManifest(s.manifest)
          })),

          reconstruction: (persisted.reconstruction ?? []).map((r: any) => r.type === 'original' ? {
            ...r,
            source: {
              ...r.source,
              canvas: parseCanvas(r.source.canvas)
            }
          } : {
            ...r,
            sources: r.sources.map((s: any) => ({
              ...s,
              canvas: parseCanvas(s.canvas)
            }))
          })
        }
      }
    }
  )
);