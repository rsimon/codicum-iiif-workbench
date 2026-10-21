import { useCallback, useRef } from 'react';
import type { Viewer } from 'openseadragon';
import type { ReconstructionCanvas, TextAnnotation } from '@/types';
import type { ComposerLayout, ComposerLayoutItem } from '../../reconstruction-types';
import { getIntersectingItems } from '../composer-utils';
import { EditableTextAnnotation } from './editable-text-annotation';
import { moveAnnotation, removeAnnotation, updateAnnotation } from './text-annotation-editor-utils';
import { getScreenScale, useItemTransform } from './use-item-transform';

interface ItemAnnotationLayerProps {

  viewer: Viewer;

  layout: ComposerLayout;

  reconstruction: ReconstructionCanvas[];

  item: ComposerLayoutItem;

  canvas: ReconstructionCanvas;

  selectedAnnotationId?: string;

}

export const ItemAnnotationLayer = (props: ItemAnnotationLayerProps) => {
  const { viewer, layout, reconstruction, item, canvas, selectedAnnotationId } = props;

  const ref = useRef<HTMLDivElement>(null);

  const annotations = canvas.annotations ?? [];

  useItemTransform(viewer, item, canvas.width, ref);

  const getScale = useCallback(
    () => getScreenScale(viewer, item, canvas.width),
    [viewer, item.x, item.y, item.width, canvas.width]);

  const onChange = (annotation: TextAnnotation) => {
    // Annotation bounds in OSD viewport coordinates
    const scale = item.width / canvas.width;

    const x1 = item.x + annotation.x * scale;
    const y1 = item.y + annotation.y * scale;
    const x2 = x1 + annotation.width * scale;
    const y2 = y1 + annotation.height * scale;

    const intersecting = getIntersectingItems({ x1, y1, x2, y2 }, layout);

    // Stay on this canvas for as long as the box still touches it
    const destination = intersecting.find(i => i.reconstructionCanvasId === canvas.id) ?? intersecting[0];

    const target = destination && destination.reconstructionCanvasId !== canvas.id
      ? reconstruction.find(c => c.id === destination.reconstructionCanvasId)
      : undefined;

    if (!destination || !target) return updateAnnotation(canvas.id, annotation);

    // Translate into the target canvas's coordinate system
    const targetScale = destination.width / target.width;

    moveAnnotation(canvas.id, target.id, {
      ...annotation,
      x: (x1 - destination.x) / targetScale,
      y: (y1 - destination.y) / targetScale,
      width: annotation.width * scale / targetScale,
      height: annotation.height * scale / targetScale,
      fontSize: annotation.fontSize * scale / targetScale
    });
  }

  return (
    <div
      ref={ref}
      className="absolute left-0 top-0 pointer-events-none"
      style={{
        width: canvas.width,
        height: canvas.height,
        transformOrigin: '0 0'
      }}>
      {annotations.map(annotation => (
        <EditableTextAnnotation
          key={annotation.id}
          annotation={annotation}
          isSelected={annotation.id === selectedAnnotationId}
          viewer={viewer}
          getScale={getScale}
          onChange={onChange}
          onRemove={() => removeAnnotation(canvas.id, annotation.id)} />
      ))}
    </div>
  )

}