import { useEffect } from 'react';
import type { CanvasClickEvent, Viewer } from 'openseadragon';
import { useMeasurement } from '@/dialogs/physical-dimensions';
import { useAppStore } from '@/store/app-store';
import { useReconstructionStore } from '../../reconstruction-store';
import type { ComposerLayout } from '../../reconstruction-types';
import { createAnnotation } from '../../reconstruction-utils';
import { getItemAt } from '../composer-utils';
import { useComposerStore } from '../composer-store';
import { ItemAnnotationLayer } from './item-annotation-layer';

interface TextAnnotationEditorProps {

  viewer: Viewer;

  layout: ComposerLayout;

  visibleIds: Set<string>;

}

export const TextAnnotationEditor = (props: TextAnnotationEditorProps) => {
  const reconstruction = useAppStore(state => state.reconstruction);

  const editMode = useComposerStore(state => state.editMode);
  const selected = useComposerStore(state => state.selectedTextAnnotation);

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

      const canvas = useAppStore.getState().reconstruction.find(c => c.id === item.reconstructionCanvasId);
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
        canvasPoint.y <= annotation.y + annotation.height);

      if (hit) {
        setSelectedImage();
        setSelectedAnnotation({ canvasId: item.reconstructionCanvasId, annotationId: hit.id });
        useReconstructionStore.getState().setSelection([canvas]);
      } else {
        console.log('[text-annotation-editor] create new!');
        createAnnotation(canvas.id, canvasPoint);
      }
    };

    props.viewer.addHandler('canvas-click', onCanvasClick);

    return () => {
      props.viewer.removeHandler('canvas-click', onCanvasClick);
    };
  }, [editMode, isTapeMeasureEnabled, props.viewer, props.layout, setSelectedAnnotation, setSelectedImage]);

  // One layer per visible layout item
  const layers = props.layout.items
    .filter(item => props.visibleIds.has(item.reconstructionCanvasId))
    .map(item => {
      const canvas = reconstruction.find(candidate => candidate.id === item.reconstructionCanvasId);
      if (!canvas) return null;
 
      return (
        <ItemAnnotationLayer
          key={item.reconstructionCanvasId}
          viewer={props.viewer}
          layout={props.layout}
          reconstruction={reconstruction}
          item={item}
          canvas={canvas}
          selectedAnnotationId={selected?.canvasId === canvas.id ? selected.annotationId : undefined} />
      );
    });

  return (
    <div className="absolute inset-0 z-60 pointer-events-none overflow-hidden">
      {layers}
    </div>
  )

}
