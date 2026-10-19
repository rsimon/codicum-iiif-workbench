import type { Viewer } from 'openseadragon';
import { TextAnnotationOverlay } from '@/components/text-annotation-overlay';
import type { ReconstructionCanvas } from '@/types';
import { ViewerSvgOverlay } from '@/components/viewer-svg-overlay';

export interface CanvasIndicatorItem {

  canvas: ReconstructionCanvas;

  x: number;

  y: number;

  width: number;

  height: number;

}

interface CanvasIndicatorProps {

  items: CanvasIndicatorItem[];

  viewer: Viewer;

}

export const CanvasIndicator = (props: CanvasIndicatorProps) => {

  return props.items.length > 0 ? (
    <>
      <ViewerSvgOverlay
        viewer={props.viewer}
        bottomLayer={
          <g>
            {props.items.map(item => (
              <rect
                key={item.canvas.id}
                x={item.x}
                y={item.y}
                width={item.width}
                height={item.height}
                fill="oklch(98.5% 0 none)"
                stroke="oklch(87% 0 none)"
                strokeWidth={1}
                strokeOpacity={1}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none" />
            ))}
          </g>
        } />

      <div className="absolute inset-0 z-[60] pointer-events-none">
        {props.items.flatMap(({ canvas, x, y, width }) => {
          const scale = width / canvas.width;
          return (canvas.annotations ?? []).filter(annotation => annotation.text.trim().length > 0).map(annotation => (
            <TextAnnotationOverlay
              key={`${canvas.id}:${annotation.id}`}
              viewer={props.viewer}
              annotation={annotation}
              canvasPlacement={{
                x,
                y,
                scale,
                width: canvas.width,
                height: canvas.height
              }} />
          ));
        })}
      </div>
    </>
  ) : null;

}