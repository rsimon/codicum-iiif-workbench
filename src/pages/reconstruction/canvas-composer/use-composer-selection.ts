import { useEffect } from 'react';
import { Point, type CanvasClickEvent, type Viewer } from 'openseadragon';
import { useAppStore } from '@/store/app-store';
import { useReconstructionStore } from '../reconstruction-store';
import type { ComposerLayout } from '../reconstruction-types';
import { getImageAt, getItemAt } from './composer-utils';
import { useComposerStore } from './composer-store';

export const useComposerSelection = (
  viewer: Viewer | undefined,
  layout: ComposerLayout,
  isTapeMeasureEnabled: boolean
) => {
  const selection = useReconstructionStore(state => state.selection);
  const setSelectedItems = useReconstructionStore(state => state.setSelection);

  const editMode = useComposerStore(state => state.editMode);
  const selectedTextAnnotation = useComposerStore(state => state.selectedTextAnnotation);
  const setSelectedImage = useComposerStore(state => state.setSelectedImage);
  const setSelectedTextAnnotation = useComposerStore(state => state.setSelectedTextAnnotation);

  // Clear selected image if canvas selection changes from outside (tree view)
  useEffect(() => {
    const { selectedImage } = useComposerStore.getState();
    if (!selectedImage) return;

    const stillSelected =
      selection.length === 1 && selection[0].id === selectedImage.item.reconstructionCanvasId;

    if (!stillSelected) setSelectedImage();
  }, [selection, setSelectedImage]);

  // Same for selected text annotation
  useEffect(() => {
    if (!selectedTextAnnotation) return;

    const stillSelected =
      selection.length === 1 && selection[0].id === selectedTextAnnotation.canvasId;

    if (!stillSelected) setSelectedTextAnnotation();
  }, [selection, selectedTextAnnotation]);

  // Bring a selected canvas into view if it isn't already visible
  useEffect(() => {
    if (!viewer) return;
    if (selection.length !== 1) return;

    const item = layout.items.find(i => i.reconstructionCanvasId === selection[0].id);
    if (!item) return;

    const bounds = viewer.viewport.getBounds(true);

    const isVisible =
      item.x < bounds.x + bounds.width && item.x + item.width > bounds.x &&
      item.y < bounds.y + bounds.height && item.y + item.height > bounds.y;

    if (isVisible) return;

    const center = new Point(item.x + item.width / 2, item.y + item.height / 2);
    viewer.viewport.panTo(center, false);
  }, [selection, viewer, layout]);

  useEffect(() => {
    if (!viewer) return;

    const onCanvasClick = (evt: CanvasClickEvent) => {
      if (!evt.quick) return; // Ignore long OSD clicks/drags

      // Ignore clicks if UI is in tape measure or TEXT edit mode
      if (isTapeMeasureEnabled || editMode === 'TEXT') return;
      
      const { metaKey } = evt.originalEvent as PointerEvent;

      const point = viewer.viewport.viewerElementToViewportCoordinates(evt.position);
      const item = getItemAt(point, layout);

      if (item) {
        // Snapshot read (prevents re-running the effect)
        const { reconstruction } = useAppStore.getState();
        
        const canvas = reconstruction.find(r => r.id === item.reconstructionCanvasId);
        if (!canvas) return;

        if (!metaKey) {
          const scale = item.width / canvas.width;
          const x = (point.x - item.x) / scale;
          const y = (point.y - item.y) / scale;
          
          const annotation = (canvas.annotations ?? []).find(annotation =>
            x >= annotation.x &&
            x <= annotation.x + annotation.width &&
            y >= annotation.y &&
            y <= annotation.y + annotation.height
          );

          if (annotation) {
            setSelectedImage();
            setSelectedTextAnnotation({
              canvasId: canvas.id,
              annotationId: annotation.id
            });
            setSelectedItems([canvas]);
            return;
          }
        }

        setSelectedTextAnnotation();

        if (metaKey) {
          setSelectedImage();
          setSelectedItems(current => [...current, canvas]);
        } else {
          const hit = getImageAt(
            point,
            layout,
            reconstruction,
            useComposerStore.getState().imagesByCanvasId
          );

          setSelectedItems(current => {
            setSelectedImage(hit);
            return current.length === 1 && current[0].id === canvas.id ? current : [canvas];
          });
        }
      } else if (!metaKey) {
        setSelectedTextAnnotation();
        setSelectedImage();
        setSelectedItems([]);
      }
    }

    viewer.addHandler('canvas-click', onCanvasClick);

    return () => {
      viewer?.removeHandler('canvas-click', onCanvasClick);
    }
  }, [viewer, layout, setSelectedItems, setSelectedImage, setSelectedTextAnnotation, isTapeMeasureEnabled, editMode]);

}