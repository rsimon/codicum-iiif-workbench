import { create } from 'zustand';
import { dequal } from 'dequal/lite';
import { withViewTransition } from '@/shadcn/utils';
import { useAppStore } from '@/store/app-store';
import type { ReconstructionCanvas } from '@/types';

const MAX_HISTORY_ENTRIES = 100;

interface ReconstructionHistoryState {

  past: ReconstructionCanvas[][];

  future: ReconstructionCanvas[][];

  canUndo: boolean;

  canRedo: boolean;

}

export const useReconstructionHistory = create<ReconstructionHistoryState>(() => ({

  past: [],

  future: [],

  canUndo: false,

  canRedo: false

}));

let isTrackedMutation = false;
let isRestoringHistory = false;
let flushPendingComposerSync = () => {};

export const registerComposerSyncFlusher = (flush: () => void) => {
  flushPendingComposerSync = flush;
}

export const withHistory = <T>(
  edit: () => T,
  options: { flushComposerSync?: boolean } = {}
): T => {
  if (isTrackedMutation) return edit();

  if (options.flushComposerSync !== false)
    flushPendingComposerSync();

  const previous = useAppStore.getState().reconstruction;
  let result!: T;

  isTrackedMutation = true;

  try {
    result = edit();
  } finally {
    isTrackedMutation = false;

    const next = useAppStore.getState().reconstruction;

    if (!dequal(previous, next)) {
      useReconstructionHistory.setState(state => {
        const past = [...state.past, previous].slice(-MAX_HISTORY_ENTRIES);
        return { past, future: [], canUndo: past.length > 0, canRedo: false };
      });
    }
  }

  return result;
}

export const withHistoryViewTransition = (edit: () => void) => {
  flushPendingComposerSync();
  withViewTransition(() => withHistory(edit, { flushComposerSync: false }));
}

const restoreReconstruction = (reconstruction: ReconstructionCanvas[]) => {
  isRestoringHistory = true;

  try {
    useAppStore.setState({ reconstruction });
  } finally {
    isRestoringHistory = false;
  }
}

export const undo = () => {
  flushPendingComposerSync();

  const { past, future } = useReconstructionHistory.getState();
  const reconstruction = past.at(-1);
  if (!reconstruction) return false;

  const current = useAppStore.getState().reconstruction;
  restoreReconstruction(reconstruction);

  const nextPast = past.slice(0, -1);
  const nextFuture = [...future, current];

  useReconstructionHistory.setState({
    past: nextPast,
    future: nextFuture,
    canUndo: nextPast.length > 0,
    canRedo: true
  });

  return true;
}

export const redo = () => {
  flushPendingComposerSync();

  const { past, future } = useReconstructionHistory.getState();
  const reconstruction = future.at(-1);
  if (!reconstruction) return false;

  const current = useAppStore.getState().reconstruction;
  restoreReconstruction(reconstruction);

  const nextPast = [...past, current].slice(-MAX_HISTORY_ENTRIES);
  const nextFuture = future.slice(0, -1);

  useReconstructionHistory.setState({
    past: nextPast,
    future: nextFuture,
    canUndo: nextPast.length > 0,
    canRedo: nextFuture.length > 0
  });

  return true;
}

useAppStore.subscribe((state, previous) => {
  if (state.reconstruction === previous.reconstruction || isTrackedMutation || isRestoringHistory)
    return;

  useReconstructionHistory.setState({
    past: [],
    future: [],
    canUndo: false,
    canRedo: false
  });
});
