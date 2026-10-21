import { useCallback, useRef } from 'react';
import type { Viewer } from 'openseadragon';
import type { ReconstructionCanvas } from '@/types';
import type { ComposerLayoutItem } from '../../reconstruction-types';
import { EditableTextAnnotation } from './editable-text-annotation';
import { getScreenScale, useItemTransform } from './use-item-transform';
import { removeAnnotation, updateAnnotation } from './text-annotation-editor-utils';

interface ItemAnnotationLayerProps {

  viewer: Viewer;

  item: ComposerLayoutItem;

  canvas: ReconstructionCanvas;

  selectedAnnotationId?: string;

}

export const ItemAnnotationLayer = (props: ItemAnnotationLayerProps) => {
  const { viewer, item, canvas, selectedAnnotationId } = props;

  const ref = useRef<HTMLDivElement>(null);

  const annotations = canvas.annotations ?? [];

  useItemTransform(viewer, item, canvas.width, ref);

  const getScale = useCallback(
    () => getScreenScale(viewer, item, canvas.width),
    [viewer, item.x, item.y, item.width, canvas.width]);

  return annotations.length > 0 ?(
    <div
      ref={ref}
      className="absolute left-0 top-0 pointer-events-non bg-red-600/20"
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
          onChange={updated => updateAnnotation(canvas.id, updated)}
          onRemove={() => removeAnnotation(canvas.id, annotation.id)} />
      ))}
    </div>
  ) : null;

}