import { useMemo } from 'react';
import { create } from 'zustand';
import { useAppStore } from '@/store/app-store';
import type { SourceManifest } from '@/types';

interface SourcesStore {

  selection?: SourceSelection;

  collapsed: Set<string>;

  showInReconstructionOnly: boolean;

  showDimensionsDialog: boolean;

  // Actions: selection
  setSelection: (selection?: SourceSelection) => void;

  // Actions: source tree
  collapseAll: () => void;
  expandAll: () => void;
  toggleSourceExpanded: (manifestId: string) => void;
  setShowInReconstructionOnly: (showInReconstructionOnly: boolean) => void;

  // Actions: physical dimensions dialog
  setShowDimensionsDialog(show: boolean): void;

}

interface SourceSelection {

  manifestId: string;

  canvasId: string;

}

export const useSourcesStore = create<SourcesStore>()(set => ({

  selection: undefined,

  collapsed: new Set(),

  showInReconstructionOnly: false,

  showDimensionsDialog: false,

  setSelection: selection => set(() => ({ selection, showDimensionsDialog: false })),

  expandAll: () => set(() => ({ collapsed: new Set() })),

  collapseAll: () => set(() => ({ collapsed: new Set(useAppStore.getState().sources.map(s => s.manifest.id)) })),

  toggleSourceExpanded: manifestId => set(({ collapsed }) => collapsed.has(manifestId) ? {
    collapsed: new Set([...collapsed].filter(id => id !== manifestId))
  } : {
    collapsed: new Set([...collapsed, manifestId])
  }),

  setShowInReconstructionOnly: showInReconstructionOnly => set({ showInReconstructionOnly  }),

  setShowDimensionsDialog: showDimensionsDialog => set({ showDimensionsDialog })

}));

export const useSelectedSource = () => {
  const sources = useAppStore(state => state.sources);
  
  const selection = useSourcesStore(state => state.selection);

  return useMemo(() => {
    if (!selection) return {};

    const { manifestId, canvasId } = selection;

    const manifest = sources.find(s => s.manifest.id === manifestId)?.manifest;

    const canvas = canvasId
      ? manifest?.canvases.find(c => c.id === canvasId)
      : manifest?.canvases[0];

    return { manifest, canvas };
  }, [selection, sources]);
  
}

// Helper: automatically selects the first available canvas
const autoSelect = (sources: SourceManifest[]) => {
  const { selection, setSelection } = useSourcesStore.getState();
  if (selection || sources.length === 0) return;

  const first = sources[0];
  setSelection(first
    ? { manifestId: first.manifest.id, canvasId: first.manifest.canvases[0]?.id }
    : undefined
  );
}

// Autoselect once after the store hydrates
autoSelect(useAppStore.getState().sources);

// Autoselect after the store changes from no sources to >1 source
useAppStore.subscribe((state, prevState) => {
  if (prevState.sources.length === 0 && state.sources.length > 0)
    autoSelect(state.sources);
});