import type { Viewer } from 'openseadragon';
import { ViewerSvgOverlay } from '@/components/viewer-svg-overlay';
import type { CanvasBounds } from './viewer';

interface CanvasIndicatorProps {

  bounds: CanvasBounds[];

  viewer: Viewer;

}

export const CanvasIndicator = (props: CanvasIndicatorProps) => {

  return props.bounds.length > 0 ? (
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
  ) : null;

}