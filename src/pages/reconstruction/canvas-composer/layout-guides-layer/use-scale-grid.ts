import { useCallback } from 'react';
import type OpenSeadragon from 'openseadragon';
import type { ComposerLayout } from '../../reconstruction-types';

const TARGET_SPACING = 4;
const MAJOR_LINE_EVERY = 10;
const LABEL_EVERY = MAJOR_LINE_EVERY * 2;

const getGoodLabelInterval = (minimum: number, baseInterval: number) => {
  const scaledMinimum = minimum / baseInterval;
  const magnitude = 10 ** Math.floor(Math.log10(scaledMinimum));
  const fraction = scaledMinimum / magnitude;

  const goodFraction = fraction <= 1
    ? 1
    : fraction <= 2
      ? 2
      : fraction <= 5
        ? 5
        : 10;

  return goodFraction * magnitude * baseInterval;
}

interface UseScaleGridProps {

  gridScale: ComposerLayout['gridScale'];

  origin: { x: number; y: number },

  showLabels: boolean;

}

export const useScaleGrid = (props: UseScaleGridProps) => useCallback((
  bg: CanvasRenderingContext2D,
  fg: CanvasRenderingContext2D,
  bounds: OpenSeadragon.Rect,
  scaleX: number,
  scaleY: number
) => {
  const { gridScale, origin, showLabels } = props;

  const pixelsPerUnit = scaleX / gridScale.unitsPerOSDUnit;
  if (!Number.isFinite(pixelsPerUnit) || pixelsPerUnit <= 0) return;

  // Purely cosmetic: 'px' needs bigger interval to look good
  const baseLabelInterval = gridScale.unit === 'px' ? 100 : 10;

  const labelInterval = getGoodLabelInterval(
    TARGET_SPACING * LABEL_EVERY / pixelsPerUnit,
    baseLabelInterval);

  const labelStep = labelInterval / LABEL_EVERY;

  const worldStep = labelStep / gridScale.unitsPerOSDUnit;
  if (!Number.isFinite(worldStep) || worldStep <= 0) return;

  const firstX = Math.ceil((bounds.x - origin.x) / worldStep);
  const lastX = Math.floor((bounds.x + bounds.width - origin.x) / worldStep);

  const firstY = Math.ceil((bounds.y - origin.y) / worldStep);
  const lastY = Math.floor((bounds.y + bounds.height - origin.y) / worldStep);

  const formatCoordinate = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 4 });

  bg.save();
  fg.save();

  bg.lineWidth = 1;

  if (showLabels) {
    fg.font = '10px ui-sans-serif, system-ui, sans-serif';
    fg.textBaseline = 'top';
  }

  for (let index = firstX; index <= lastX; index++) {
    const worldX = origin.x + index * worldStep;
    const screenX = (worldX - bounds.x) * scaleX;
    const isMajor = index % MAJOR_LINE_EVERY === 0;

    bg.strokeStyle = isMajor ? 'rgba(71, 85, 105, 0.12)' : 'rgba(100, 116, 139, 0.06)';
    bg.beginPath();
    bg.moveTo(Math.round(screenX) + 0.5, 0);
    bg.lineTo(Math.round(screenX) + 0.5, bounds.height * scaleY);
    bg.stroke();

    if (showLabels && index % LABEL_EVERY === 0) {
      const label = `${formatCoordinate.format(index * labelStep)} ${gridScale.unit}`;

      fg.lineWidth = 2;
      fg.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      fg.strokeText(label, screenX + 4, 4);
      fg.fillStyle = 'rgba(51, 65, 85, 0.8)';
      fg.fillText(label, screenX + 4, 4);
      fg.lineWidth = 1;
    }
  }

  for (let index = firstY; index <= lastY; index++) {
    const worldY = origin.y + index * worldStep;
    const screenY = (worldY - bounds.y) * scaleY;
    const isMajor = index % MAJOR_LINE_EVERY === 0;
    
    bg.strokeStyle = isMajor ? 'rgba(71, 85, 105, 0.12)' : 'rgba(100, 116, 139, 0.06)';
    bg.beginPath();
    bg.moveTo(0, Math.round(screenY) + 0.5);
    bg.lineTo(bounds.width * scaleX, Math.round(screenY) + 0.5);
    bg.stroke();

    if (showLabels && index % LABEL_EVERY === 0) {
      const label = `${formatCoordinate.format(index * labelStep)} ${gridScale.unit}`;

      fg.lineWidth = 3;
      fg.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      fg.strokeText(label, 4, screenY + 4);
      fg.fillStyle = 'rgba(51, 65, 85, 0.8)';
      fg.fillText(label, 4, screenY + 4);
      fg.lineWidth = 1;
    }
  }

  bg.restore();
  fg.restore();
}, [
  props.gridScale.unit, 
  props.gridScale.unitsPerOSDUnit, 
  props.origin.x, 
  props.origin.y, 
  props.showLabels
]);
