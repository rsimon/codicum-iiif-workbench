import type { Viewer } from 'openseadragon';
import { ViewerSvgOverlay } from '@/components/viewer-svg-overlay';
import type { CanvasPlacement } from './viewer';

interface CanvasIndicatorProps {

  canvases: CanvasPlacement[];

  viewer: Viewer;

}

export const CanvasIndicator = (props: CanvasIndicatorProps) => {

  return props.canvases.length > 0 ? (
    <ViewerSvgOverlay
      viewer={props.viewer}
      bottomLayer={
        <g>
          {props.canvases.map((p, idx) => (
            <rect
              key={idx}
              x={p.x}
              y={p.y}
              width={p.width}
              height={p.height}
              fill="oklch(98.5% 0 none)" // neutral-50
              stroke="oklch(87% 0 none)" // neutral-300
              strokeWidth={1}
              strokeOpacity={1}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none" />
          ))}
        </g>
      } />
  ) : null;

}