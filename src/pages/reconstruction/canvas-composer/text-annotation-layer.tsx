import { useEffect } from 'react';
import type { CanvasClickEvent, Viewer } from 'openseadragon';
import { TextAnnotationOverlay } from '@/components/text-annotation-overlay';
import type { TextAnnotation } from '@/types';
import { useAppStore } from '@/store/app-store';
import { useMeasurement } from '@/dialogs/physical-dimensions';
import { withHistory } from '../reconstruction-history';
import { useReconstructionStore } from '../reconstruction-store';
import type { ComposerLayout } from '../reconstruction-types';
import { getItemAt } from './composer-utils';
import { useComposerStore } from './composer-store';

interface TextAnnotationLayerProps {

  viewer: Viewer;

  layout: ComposerLayout;

  visibleIds: Set<string>;

}

const updateAnnotation = (canvasId: string, annotation: TextAnnotation) => {
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

const createAnnotation = (canvasId: string, point: { x: number; y: number }) => {
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

export const TextAnnotationLayer = (props: TextAnnotationLayerProps) => {
  const reconstruction = useAppStore(state => state.reconstruction);
  const editMode = useComposerStore(state => state.editMode);
  const selectedAnnotation = useComposerStore(state => state.selectedTextAnnotation);
  const setSelectedAnnotation = useComposerStore(state => state.setSelectedTextAnnotation);
  const setSelectedImage = useComposerStore(state => state.setSelectedImage);
  const { isTapeMeasureEnabled } = useMeasurement();

  useEffect(() => {
    if (editMode !== 'TEXT' || isTapeMeasureEnabled) return;

    const onCanvasClick = (event: CanvasClickEvent) => {
      if (!event.quick) return;

      const point = props.viewer.viewport.pointFromPixel(event.position);
      const item = getItemAt(point, props.layout);
      if (!item) return;

      const canvas = useAppStore.getState().reconstruction.find(
        candidate => candidate.id === item.reconstructionCanvasId
      );
      if (!canvas) return;

      const scale = item.width / canvas.width;
      const canvasPoint = {
        x: (point.x - item.x) / scale,
        y: (point.y - item.y) / scale
      };
      const hit = (canvas.annotations ?? []).find(annotation =>
        canvasPoint.x >= annotation.x &&
        canvasPoint.x <= annotation.x + annotation.width &&
        canvasPoint.y >= annotation.y &&
        canvasPoint.y <= annotation.y + annotation.height
      );

      if (hit) {
        setSelectedImage();
        setSelectedAnnotation({ canvasId: canvas.id, annotationId: hit.id });
        useReconstructionStore.getState().setSelection([canvas]);
      } else {
        createAnnotation(canvas.id, canvasPoint);
      }
    };

    props.viewer.addHandler('canvas-click', onCanvasClick);
    return () => {
      props.viewer.removeHandler('canvas-click', onCanvasClick);
    };
  }, [editMode, isTapeMeasureEnabled, props.viewer, props.layout, setSelectedAnnotation, setSelectedImage]);

  const visibleItems = props.layout.items.filter(item => props.visibleIds.has(item.reconstructionCanvasId));

  return (
    <div className="absolute inset-0 z-[60] pointer-events-none">
      {visibleItems.flatMap(item => {
        const canvas = reconstruction.find(candidate => candidate.id === item.reconstructionCanvasId);
        if (!canvas) return [];

        const scale = item.width / canvas.width;
        return (canvas.annotations ?? []).map(annotation => {
          const selected = selectedAnnotation?.canvasId === canvas.id && selectedAnnotation.annotationId === annotation.id;
          const editing = selected;
          const interactive = editMode === 'TEXT' || annotation.text.length > 0;
          return (
            <TextAnnotationOverlay
              key={`${canvas.id}:${annotation.id}`}
              annotation={annotation}
              canvasPlacement={{
                x: item.x,
                y: item.y,
                scale,
                width: canvas.width,
                height: canvas.height
              }}
              viewer={props.viewer}
              interactive={interactive}
              editable={editing}
              selected={editing}
              showEmpty={editing}
              onSelect={() => {
                setSelectedImage();
                setSelectedAnnotation({ canvasId: canvas.id, annotationId: annotation.id });
                useReconstructionStore.getState().setSelection([canvas]);
              }}
              onCommit={updated => updateAnnotation(canvas.id, updated)} />
          );
        });
      })}
    </div>
  )
}
