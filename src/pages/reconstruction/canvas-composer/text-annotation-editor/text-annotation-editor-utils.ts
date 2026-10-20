import type { Point } from 'openseadragon';
import { useAppStore } from '@/store/app-store';
import type { ReconstructionCanvas, TextAnnotation } from '@/types';
import { withHistory } from '../../reconstruction-history';
import type { ComposerLayoutItem } from '../../reconstruction-types';

export const getTextAnnotationAt = (osdPoint: Point,  canvas: ReconstructionCanvas): TextAnnotation | undefined => {
  const canvas = useAppStore.getState().reconstruction.find(c => c.id === item.reconstructionCanvasId);
  if (!canvas) return;

  const scale = item.width / canvas.width;

  const canvasPoint = {
    x: (osdPoint.x - item.x) / scale,
    y: (osdPoint.y - item.y) / scale
  };

  return (canvas.annotations ?? []).find(annotation =>
    canvasPoint.x >= annotation.x &&
    canvasPoint.x <= annotation.x + annotation.width &&
    canvasPoint.y >= annotation.y &&
    canvasPoint.y <= annotation.y + annotation.height
  );
}

export const updateAnnotation = (canvasId: string, annotation: TextAnnotation) => {
  withHistory(() => {
    const { reconstruction, updateReconstruction } = useAppStore.getState();
    const canvas = reconstruction.find(item => item.id === canvasId);
    if (!canvas) return;

    const annotations = canvas.annotations ?? [];
    const previous = annotations.find(item => item.id === annotation.id);
    if (!previous) return;

    const nextAnnotations = annotations.map(item => item.id === annotation.id ? annotation : item);
    if (nextAnnotations.every((item, index) => item === annotations[index])) return;

    updateReconstruction(reconstruction.map(item => item.id === canvasId
      ? { ...item, annotations: nextAnnotations }
      : item));
  });
}

export const createAnnotation = (canvasId: string, point: { x: number; y: number }) => {
  withHistory(() => {
    const { reconstruction, updateReconstruction } = useAppStore.getState();
    const canvas = reconstruction.find(item => item.id === canvasId);
    if (!canvas) return;

    const x = Math.max(0, Math.min(point.x, Math.max(0, canvas.width - 80)));
    const y = Math.max(0, Math.min(point.y, Math.max(0, canvas.height - 48)));
    
    const annotation: TextAnnotation = {
      id: crypto.randomUUID(),
      text: '',
      x,
      y,
      width: Math.min(canvas.width - x, Math.max(80, canvas.width * 0.4)),
      height: Math.min(canvas.height - y, Math.max(48, canvas.height * 0.16))
    };

    updateReconstruction(reconstruction.map(item => item.id === canvasId
      ? { ...item, annotations: [...(item.annotations ?? []), annotation] }
      : item));

    useComposerStore.getState().setSelectedImage();
    useComposerStore.getState().setSelectedTextAnnotation({
      canvasId,
      annotationId: annotation.id
    });
    useReconstructionStore.getState().setSelection([canvas]);
  });
}
