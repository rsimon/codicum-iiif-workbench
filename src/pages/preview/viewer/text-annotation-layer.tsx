import { useEffect, useRef } from 'react';
import { Point, type Viewer } from 'openseadragon';
import type { TextAnnotation } from '@/types';
import type { CanvasPlacement } from './viewer';

interface TextAnnotationLayerProps {

  canvases: CanvasPlacement[];

  viewer: Viewer;

}

export const TextAnnotationLayer = (props: TextAnnotationLayerProps) => {
  const { canvases, viewer } = props;

  const refs = useRef<(HTMLDivElement |  null)[]>([]);

  useEffect(() => {
    const onUpdateViewport = () => {
      const { viewport } = viewer;
      if (!viewport) return;

      canvases.forEach((p, i) => {
        const el = refs.current[i];
        if (!el) return;

        // OSD world -> screen px
        const topLeft = viewport.pixelFromPoint(new Point(p.x, p.y), true);
        const topRight = viewport.pixelFromPoint(new Point(p.x + p.width, p.y), true);

        // Canvas px -> screen px
        const scale = (topRight.x - topLeft.x) / p.canvas.width;

        el.style.transform = `translate(${topLeft.x}px, ${topLeft.y}px) scale(${scale})`;
      });
    }

    onUpdateViewport();

    viewer.addHandler('update-viewport', onUpdateViewport);

    return () => {
      viewer.removeHandler('update-viewport', onUpdateViewport);
    };
  }, [canvases, viewer]);
  
  return props.canvases.length > 0 ? (
    <div className="absolute inset-0 z-60 pointer-events-none overflow-hidden">
      {props.canvases.map((p, idx) => (
        <div
          key={idx}
          ref={el => { refs.current[idx] = el; }}
          className="absolute left-0 top-0 pointer-events-none"
          style={{
            width: p.canvas.width,       // canvas px space, NOT screen px
            height: p.canvas.height,
            transformOrigin: '0 0'
          }}>
          {(p.canvas.annotations ?? []) .map(annotation => (
            <TextAnnotationOverlay key={annotation.id} annotation={annotation} />
          ))}
        </div>
      ))}
    </div>
  ) : null;

}

interface TextAnnotationOverlayProps {

  annotation: TextAnnotation;

}

export const TextAnnotationOverlay = (props: TextAnnotationOverlayProps) => {
  const { annotation } = props;

  return (
    <div
      className="absolute pointer-none:"
      style={{
        left: annotation.x,
        top: annotation.y,
        width: annotation.width,
        height: annotation.height
      }}
      onPointerDown={evt => evt.stopPropagation()}>

      <textarea
        readOnly
        className="size-full resize-none overflow-hidden outline-none whitespace-pre-wrap leading-relaxed box-border wrap-break-word"
        value={annotation.text}
        tabIndex={-1}
        style={{
          fontSize: annotation.fontSize,
          padding: annotation.fontSize / 2
        }} />
    </div>
  )

}