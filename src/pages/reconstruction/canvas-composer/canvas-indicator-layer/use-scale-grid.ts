import { useCallback } from 'react';
import type OpenSeadragon from 'openseadragon';
import type { ComposerLayout } from '../../reconstruction-types';

const TARGET_SPACING = 8;
const MAJOR_LINE_EVERY = 10;
const LABEL_EVERY = MAJOR_LINE_EVERY * 2;

export const useScaleGrid = (
  gridScale: ComposerLayout['gridScale'],
  origin: { x: number; y: number },
  showLabels = true
) => useCallback((
  context: CanvasRenderingContext2D,
  labelContext: CanvasRenderingContext2D,
  bounds: OpenSeadragon.Rect,
  scaleX: number,
  scaleY: number
) => {
  const pixelsPerUnit = scaleX / gridScale.unitsPerOSDUnit;
  if (!Number.isFinite(pixelsPerUnit) || pixelsPerUnit <= 0) return;

  const exponent = Math.max(-30, Math.min(40, Math.round(Math.log2(TARGET_SPACING / pixelsPerUnit))));
  const step = 2 ** exponent;
  const worldStep = step / gridScale.unitsPerOSDUnit;
  if (!Number.isFinite(worldStep) || worldStep <= 0) return;

  const firstX = Math.ceil((bounds.x - origin.x) / worldStep);
  const lastX = Math.floor((bounds.x + bounds.width - origin.x) / worldStep);
  const firstY = Math.ceil((bounds.y - origin.y) / worldStep);
  const lastY = Math.floor((bounds.y + bounds.height - origin.y) / worldStep);
  const formatCoordinate = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 4 });

  context.save();
  labelContext.save();
  context.lineWidth = 1;
  if (showLabels) {
    labelContext.font = '10px ui-sans-serif, system-ui, sans-serif';
    labelContext.textBaseline = 'top';
  }

  for (let index = firstX; index <= lastX; index++) {
    const worldX = origin.x + index * worldStep;
    const screenX = (worldX - bounds.x) * scaleX;
    const isMajor = index % MAJOR_LINE_EVERY === 0;
    context.strokeStyle = isMajor ? 'rgba(71, 85, 105, 0.12)' : 'rgba(100, 116, 139, 0.06)';
    context.beginPath();
    context.moveTo(Math.round(screenX) + 0.5, 0);
    context.lineTo(Math.round(screenX) + 0.5, bounds.height * scaleY);
    context.stroke();

    if (showLabels && index % LABEL_EVERY === 0) {
      const label = `${formatCoordinate.format(index * step)} ${gridScale.unit}`;
      labelContext.lineWidth = 3;
      labelContext.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      labelContext.strokeText(label, screenX + 4, 4);
      labelContext.fillStyle = 'rgba(51, 65, 85, 0.8)';
      labelContext.fillText(label, screenX + 4, 4);
      labelContext.lineWidth = 1;
    }
  }

  for (let index = firstY; index <= lastY; index++) {
    const worldY = origin.y + index * worldStep;
    const screenY = (worldY - bounds.y) * scaleY;
    const isMajor = index % MAJOR_LINE_EVERY === 0;
    context.strokeStyle = isMajor ? 'rgba(71, 85, 105, 0.12)' : 'rgba(100, 116, 139, 0.06)';
    context.beginPath();
    context.moveTo(0, Math.round(screenY) + 0.5);
    context.lineTo(bounds.width * scaleX, Math.round(screenY) + 0.5);
    context.stroke();

    if (showLabels && index % LABEL_EVERY === 0) {
      const label = `${formatCoordinate.format(index * step)} ${gridScale.unit}`;
      labelContext.lineWidth = 3;
      labelContext.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      labelContext.strokeText(label, 4, screenY + 4);
      labelContext.fillStyle = 'rgba(51, 65, 85, 0.8)';
      labelContext.fillText(label, 4, screenY + 4);
      labelContext.lineWidth = 1;
    }
  }

  context.restore();
  labelContext.restore();
}, [gridScale.unit, gridScale.unitsPerOSDUnit, origin.x, origin.y, showLabels]);
