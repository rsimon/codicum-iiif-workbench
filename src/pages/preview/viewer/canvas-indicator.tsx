import type { Viewer } from 'openseadragon';
import { TextAnnotationOverlay } from '@/components/text-annotation-overlay';
import type { ReconstructionCanvas } from '@/types';
import { ViewerSvgOverlay } from '@/components/viewer-svg-overlay';
import type { CanvasBounds } from './viewer';

interface CanvasIndicatorProps {

  bounds: CanvasBounds[];

  viewer: Viewer;

  pages: (ReconstructionCanvas | undefined)[];

}

export const CanvasIndicator = (props: CanvasIndicatorProps) => {

  return props.bounds.length > 0 ? (
    <>
      <ViewerSvgOverlay
        viewer={props.viewer}
        bottomLayer={
          <g>
            {props.bounds.map((b, idx) => (
              <rect
                key={idx}
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
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
        {props.bounds.flatMap(bounds => {
          const canvas = props.pages.find(page => page?.id === bounds.canvasId);
          if (!canvas) return [];

          const scale = bounds.width / canvas.width;
          return (canvas.annotations ?? []).filter(annotation => annotation.text.trim().length > 0).map(annotation => (
            <TextAnnotationOverlay
              key={`${canvas.id}:${annotation.id}`}
              viewer={props.viewer}
              placement={{
                annotation,
                x: bounds.x + annotation.x * scale,
                y: bounds.y + annotation.y * scale,
                width: annotation.width * scale,
                height: annotation.height * scale,
                scale,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height
              }} />
          ));
        })}
      </div>
    </>
  ) : null;

}