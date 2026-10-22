import { dequal } from 'dequal/lite';
import { useAppStore } from '@/store/app-store';
import type { TextAnnotation } from '@/types';
import { useComposerStore } from './canvas-composer/composer-store';
import { withHistory } from './reconstruction-history';
import { useReconstructionStore } from './reconstruction-store';
import type { DraggableImage } from './reconstruction-types';

export const getImageKey = (image: DraggableImage): string =>
  `${image.sourceCanvasId}:${image.sourceCanvasInstanceId}:${image.index}`;

export const getCanvasImageKey = (canvasId: string, image: DraggableImage): string =>
  `${canvasId}:${getImageKey(image)}`;

// Annotation font size relative to canvas width
const FONT_SIZE_RATIO = 0.02;

export const createAnnotation = (canvasId: string, point: { x: number; y: number }) => {
  withHistory(() => {
    const { reconstruction, updateReconstruction } = useAppStore.getState();
    const canvas = reconstruction.find(item => item.id === canvasId);
    if (!canvas) return;

    const x = Math.max(0, Math.min(point.x, Math.max(0, canvas.width - 80)));
    const y = Math.max(0, Math.min(point.y, Math.max(0, canvas.height - 48)));

    const annotation: TextAnnotation = {
      id: crypto.randomUUID(),
      x,
      y,
      width: Math.min(canvas.width - x, Math.max(80, canvas.width * 0.4)),
      height: Math.min(canvas.height - y, Math.max(48, canvas.height * 0.16)),
      fontSize: Math.round(canvas.width * FONT_SIZE_RATIO),
      content: {
        type: 'doc',
        content: [{ type: 'paragraph' }]
      }
    };

    updateReconstruction(reconstruction.map(item => item.id === canvasId
      ? { ...item, annotations: [...(item.annotations ?? []), annotation] }
      : item));

    useComposerStore.getState().setSelectedTextAnnotation({ canvasId, annotationId: annotation.id });
    useReconstructionStore.getState().setSelection([canvas]);
  });
}

export const updateAnnotation = (canvasId: string, annotation: TextAnnotation) => {
  withHistory(() => {
    const { reconstruction, updateReconstruction } = useAppStore.getState();
    const canvas = reconstruction.find(item => item.id === canvasId);
    if (!canvas) return;

    const annotations = canvas.annotations ?? [];

    const previous = annotations.find(item => item.id === annotation.id);
    if (!previous || dequal(previous, annotation)) return;

    updateReconstruction(reconstruction.map(item => item.id === canvasId
      ? { ...item, annotations: annotations.map(a => a.id === annotation.id ? annotation : a) }
      : item));
  });
}

export const moveAnnotation = (fromCanvasId: string, toCanvasId: string, annotation: TextAnnotation) => {
  withHistory(() => {
    const { reconstruction, updateReconstruction } = useAppStore.getState();

    const from = reconstruction.find(item => item.id === fromCanvasId);
    const to = reconstruction.find(item => item.id === toCanvasId);
    if (!from?.annotations?.some(a => a.id === annotation.id) || !to) return;

    updateReconstruction(reconstruction.map(item => {
      if (item.id === fromCanvasId)
        return { ...item, annotations: (item.annotations ?? []).filter(a => a.id !== annotation.id) };

      if (item.id === toCanvasId)
        return { ...item, annotations: [...(item.annotations ?? []), annotation] };

      return item;
    }));

    useComposerStore.getState().setSelectedTextAnnotation({ canvasId: toCanvasId, annotationId: annotation.id });
    useReconstructionStore.getState().setSelection([to]);
  });
}

export const removeAnnotation = (canvasId: string, annotationId: string) => {
  withHistory(() => {
    const { reconstruction, updateReconstruction } = useAppStore.getState();
    const canvas = reconstruction.find(item => item.id === canvasId);
    if (!canvas?.annotations?.some(a => a.id === annotationId)) return;

    updateReconstruction(reconstruction.map(item => item.id === canvasId
      ? { ...item, annotations: (item.annotations ?? []).filter(a => a.id !== annotationId) }
      : item));
  });

  const { selectedTextAnnotation, setSelectedTextAnnotation } = useComposerStore.getState();

  if (selectedTextAnnotation?.canvasId === canvasId && selectedTextAnnotation.annotationId === annotationId)
    setSelectedTextAnnotation(undefined);
}