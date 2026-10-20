import { useCallback, useRef } from 'react';
import type { Viewer } from 'openseadragon';
import type { ReconstructionCanvas, TextAnnotation } from '@/types';
import type { ComposerLayoutItem } from '../../reconstruction-types';
import { EditableTextAnnotation } from './editable-text-annotation';
import { getScreenScale, useItemTransform } from './use-item-transform';

interface ItemAnnotationLayerProps {

  viewer: Viewer;

  item: ComposerLayoutItem;

  canvas: ReconstructionCanvas;

  selectedAnnotationId?: string;

  onChange(canvasId: string, updated: TextAnnotation): void;

}

export const ItemAnnotationLayer = (props: ItemAnnotationLayerProps) => {
  const { viewer, item, canvas, selectedAnnotationId, onChange } = props;

  const ref = useRef<HTMLDivElement>(null);

  useItemTransform(viewer, item, canvas.width, ref);

  const getScale = useCallback(
    () => getScreenScale(viewer, item, canvas.width),
    [viewer, item.x, item.y, item.width, canvas.width]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-0 pointer-events-non bg-red-600/20"
      style={{
        width: canvas.width,
        height: canvas.height,
        transformOrigin: '0 0'
      }}>
      {(canvas.annotations ?? []).map(annotation => (
        <EditableTextAnnotation
          key={annotation.id}
          annotation={annotation}
          isSelected={annotation.id === selectedAnnotationId}
          viewer={viewer}
          getScale={getScale}
          onChange={updated => onChange(canvas.id, updated)} />
      ))}
    </div>
  )

}