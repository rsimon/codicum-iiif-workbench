import { create } from 'zustand';
import { Viewer, TiledImage } from 'openseadragon';
import { dequal } from 'dequal/lite';
import { withViewTransition } from '@/shadcn/utils';
import { useAppStore } from '@/store/app-store';
import type { ReconstructionCanvas } from '@/types';
import { getImageKey, getCanvasImageKey } from '../reconstruction-utils';
import type { ComposerLayout, DraggableImage, DraggableImageSelection } from '../reconstruction-types';
import { registerComposerSyncFlusher, withHistory } from '../reconstruction-history';
import { applyEdits, findSourceCanvasById, toDraggableImages } from './composer-utils';
import { TwoColumnLayout } from './layout';

export type EditMode = 'RESIZE' | 'CROP';

export interface ComposerState {

  viewer?: Viewer;

  layout: ComposerLayout;

  // Images by reconstruction canvas ID
  imagesByCanvasId: Map<string, DraggableImage[]>,

  hasPendingSync: boolean;

  // OSD images - non-reactive & mutable by convention, use without re-render
  tiledImages: Map<string, TiledImage>;

  // Keys with an addTiledImage() call in progress, but not yet loaded as `tiledImages`.
  pendingTiledImageKeys: Set<string>;

  selectedImage?: DraggableImageSelection;

  editMode: EditMode;

  isUserEdit: boolean;

  setViewer(viewer?: Viewer): void;

  setLayout(layout: ComposerLayout): void;

  setSelectedImage(selectedImage?: DraggableImageSelection): void;

  setEditMode(mode: EditMode): void;

  setIsUserEdit(isDraggingImage: boolean): void;

  updateImage(canvasId: string, updated: DraggableImage): void;

  changeImageZOrder(canvasId: string, image: DraggableImage, direction: 'up' | 'down'): void;

  moveImageToCanvas(fromReconstructionCanvasId: string, toReconstructionCanvasId: string, image: DraggableImage): boolean;

}

export const useComposerStore = create<ComposerState>((set, get) => ({

  viewer: undefined,

  layout: TwoColumnLayout(useAppStore.getState().reconstruction),

  imagesByCanvasId: new Map(useAppStore.getState().reconstruction.map(r => [r.id, toDraggableImages(r)])),

  hasPendingSync: false,

  tiledImages: new Map(),

  pendingTiledImageKeys: new Set(),

  selectedImage: undefined,

  editMode: 'RESIZE',

  isUserEdit: false,

  setViewer: viewer => set({ viewer }),

  setLayout: layout => set({ layout }),

  setSelectedImage: selectedImage => set({ selectedImage, editMode: 'RESIZE' }),

  setEditMode: editMode => set({ editMode }),

  setIsUserEdit: isUserEdit => set({ isUserEdit }),

  updateImage: (canvasId, updated) => set(({ imagesByCanvasId, selectedImage }) => {
    const onThisCanvas = imagesByCanvasId.get(canvasId);
    if (!onThisCanvas) return {};

    const key = getCanvasImageKey(canvasId, updated);

    const prevImage = onThisCanvas.find(img => getCanvasImageKey(canvasId, img) === key);
    if (!prevImage) return {};

    const nextImages = onThisCanvas.map(img => img === prevImage ? updated : img);

    const updatedImagesByCanvasId = new Map(imagesByCanvasId);
    updatedImagesByCanvasId.set(canvasId, nextImages);

    const updatedSelectedImage =
      selectedImage?.item.reconstructionCanvasId === canvasId &&
      getCanvasImageKey(selectedImage.item.reconstructionCanvasId, selectedImage.image) === key
        ? { ...selectedImage, image: updated }
        : undefined;

    // Debounced upwards sync to the main (persistent) app store
    scheduleAppStoreSync();

    return {
      imagesByCanvasId: updatedImagesByCanvasId,
      hasPendingSync: true,
      ...(updatedSelectedImage ? { selectedImage: updatedSelectedImage } : {})
    };
  }),

  changeImageZOrder: (canvasId, image, direction) => set(({ imagesByCanvasId }) => {
    const images = imagesByCanvasId.get(canvasId);
    if (!images) return {};

    const key = getCanvasImageKey(canvasId, image);
    const index = images.findIndex(current => getCanvasImageKey(canvasId, current) === key);

    const nextIndex = index + (direction === 'up' ? 1 : -1);
    if (index < 0 || nextIndex < 0 || nextIndex >= images.length) return {};

    // z-Index is simply the array order - swap position
    const nextImages = [...images];
    [nextImages[index], nextImages[nextIndex]] = [nextImages[nextIndex], nextImages[index]];

    const updatedImagesByCanvasId = new Map(imagesByCanvasId);
    updatedImagesByCanvasId.set(canvasId, nextImages);

    scheduleAppStoreSync();
    
    return { imagesByCanvasId: updatedImagesByCanvasId, hasPendingSync: true };
  }),

  moveImageToCanvas: (fromId, toId, image) => {
    const { imagesByCanvasId, layout, selectedImage } = get();

    const key = getCanvasImageKey(fromId, image);

    // Basic integrity check
    const isValidSource = imagesByCanvasId.get(fromId)?.some(i => getCanvasImageKey(fromId, i) === key);
    if (!isValidSource) return false;

    // Next, make sure the image can be moved, without splitting a source canvas!
    const { reconstruction } = useAppStore.getState();
    const sourceCanvas = findSourceCanvasById(image.sourceCanvasId, reconstruction);
    const isValidChange = sourceCanvas?.canvas.images.length === 1;
    if (!isValidChange) return false;

    // All good - now update the imagesByCanvas map and schedule the app store sync
    const updatedImagesByCanvasId = new Map(imagesByCanvasId);

    const nextFrom = (updatedImagesByCanvasId.get(fromId) || []).filter(i => getCanvasImageKey(fromId,i) !== key);
    const nextTo = [...(updatedImagesByCanvasId.get(toId) || []), image];

    updatedImagesByCanvasId.set(fromId, nextFrom);
    updatedImagesByCanvasId.set(toId, nextTo);

    const updatedSelectedImage =
      selectedImage && getCanvasImageKey(fromId, selectedImage.image) === key ? {
        image,
        canChangeItem: selectedImage.canChangeItem,
        item: layout.items.find(i => i.reconstructionCanvasId === toId)!
      } : undefined;

    scheduleAppStoreSync();

    set({
      imagesByCanvasId: updatedImagesByCanvasId,
      hasPendingSync: true,
      ...(updatedSelectedImage ? { selectedImage: updatedSelectedImage } : {})
    });

    return true;
  }
}));

let appStoreSyncTimeout: ReturnType<typeof setTimeout> | undefined;
let isCommittingComposerSync = false;

// Animated commits cause view transitions! They happen only for changes
// that affect top-level canvas structure of the Reconstruction. Image-level
// changes (resize, move, crop) don't trigger view transitions.
let pendingAnimatedCommit: (() => void) | undefined;

// Debounced upwards sync to root app state
const commitAppStoreSync = (suppressViewTransition = false) => {
  appStoreSyncTimeout = undefined;
  pendingAnimatedCommit = undefined;

  const { reconstruction, updateReconstruction } = useAppStore.getState();
  const { imagesByCanvasId } = useComposerStore.getState();

  const next = applyEdits(reconstruction, imagesByCanvasId);

  const changed = next.length !== reconstruction.length || next.some((r, i) => r !== reconstruction[i]);
  if (!changed) {
    useComposerStore.setState({ hasPendingSync: false });
    return;
  }

  // View transitions block events - so we prevent if it's not needed
  const isAnimatedChange = next.length !== reconstruction.length ||
    next.some((r, i) => r.id !== reconstruction[i].id || r.type !== reconstruction[i].type);

  const commit = () => {
    if (isAnimatedChange && !suppressViewTransition && pendingAnimatedCommit !== commit) return;
    pendingAnimatedCommit = undefined;

    isCommittingComposerSync = true;
    try {
      withHistory(() => updateReconstruction(next), { flushComposerSync: false });
    } finally {
      isCommittingComposerSync = false;
    }
    useComposerStore.setState({ hasPendingSync: false });
  };

  if (isAnimatedChange && !suppressViewTransition) {
    pendingAnimatedCommit = commit;
    withViewTransition(commit);
  } else {
    commit();
  }
}

const scheduleAppStoreSync = () => {
  if (appStoreSyncTimeout !== undefined)
    clearTimeout(appStoreSyncTimeout);

  appStoreSyncTimeout = setTimeout(commitAppStoreSync, 250);
}

const flushAppStoreSync = () => {
  if (appStoreSyncTimeout !== undefined) {
    clearTimeout(appStoreSyncTimeout);
    commitAppStoreSync(true);
  }

  pendingAnimatedCommit?.();
}

registerComposerSyncFlusher(flushAppStoreSync);

// Downwards sync from app store to local state
useAppStore.subscribe((state, prevState) => {
  if (!isCommittingComposerSync && state.reconstruction !== prevState.reconstruction) {
    if (appStoreSyncTimeout !== undefined)
      clearTimeout(appStoreSyncTimeout);
    appStoreSyncTimeout = undefined;
    pendingAnimatedCommit = undefined;
  }

  // Layout only needs recomputing if structural props changed by value.
  const stripIrrelevant = (r: ReconstructionCanvas) => {
    const { id, width, height } = r;
    return { id, width, height };
  }

  const before = prevState.reconstruction.map(stripIrrelevant);
  const after = state.reconstruction.map(stripIrrelevant);
  const layoutChanged = !dequal(before, after);

  // Images only need recomputing per canvas: reuse the existing array
  // reference for any canvas that didn't itself change.
  const prevById = new Map(prevState.reconstruction.map(r => [r.id, r]));

  const { 
    imagesByCanvasId: prevImages,
    hasPendingSync: prevHasPendingSync,
    layout: prevLayout,
    selectedImage: prevSelectedImage 
  } = useComposerStore.getState();

  const imagesByCanvasId = new Map(state.reconstruction.map(r => {
    const prevForCanvas = prevImages.get(r.id);

    // Maintain object references
    if (prevById.get(r.id) === r) return [r.id, prevForCanvas ?? toDraggableImages(r)] as const;

    const nextImages = toDraggableImages(r);
    return [r.id, prevForCanvas && dequal(prevForCanvas, nextImages) ? prevForCanvas : nextImages] as const;
  }));

  // Important: we'll skip updates if nothing actually differs - to prevents
  // infinite loop from the 'upwards sync' to the app state after a user edit
  const imagesChanged =
    imagesByCanvasId.size !== prevImages.size ||
      [...imagesByCanvasId].some(([id, images]) => prevImages.get(id) !== images);

  const layout = layoutChanged ? TwoColumnLayout(state.reconstruction) : prevLayout;
  const hasPendingSync = isCommittingComposerSync ? prevHasPendingSync : false;

  let selectedImage = prevSelectedImage;

  if (prevSelectedImage && (layoutChanged || imagesChanged)) {
    const key = getImageKey(prevSelectedImage.image);

    const sameSource = (image: DraggableImage) =>
      image.sourceCanvasInstanceId === prevSelectedImage.image.sourceCanvasInstanceId &&
      image.resource.source.id === prevSelectedImage.image.resource.source.id;

    const samePlacement = (image: DraggableImage) =>
      image.x === prevSelectedImage.image.x &&
      image.y === prevSelectedImage.image.y &&
      image.width === prevSelectedImage.image.width &&
      JSON.stringify(image.crop) === JSON.stringify(prevSelectedImage.image.crop);

    let selection: { canvasId: string; image: DraggableImage } | undefined;

    for (const [canvasId, images] of imagesByCanvasId) {
      const image = images.find(image => sameSource(image) && samePlacement(image)) ??
        images.find(sameSource) ??
        images.find(image => getImageKey(image) === key);
        
      if (!image) continue;

      selection = { canvasId, image };
      break;
    }

    const item = selection
      ? layout.items.find(i => i.reconstructionCanvasId === selection.canvasId)
      : undefined;

    selectedImage = item && selection
      ? { ...prevSelectedImage, item, image: selection.image }
      : undefined;
  }

  if (
    !layoutChanged &&
    !imagesChanged &&
    selectedImage === prevSelectedImage &&
    hasPendingSync === prevHasPendingSync
  ) return;

  useComposerStore.setState({
    hasPendingSync,
    ...(layoutChanged ? { layout } : {}),
    ...(imagesChanged ? { imagesByCanvasId } : {}),
    ...(selectedImage !== prevSelectedImage ? { selectedImage } : {})
  });
});