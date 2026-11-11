import type { ReconstructionCanvas } from '@/types';
import type { ComposerLayout, ComposerLayoutItem } from '../reconstruction-types';

export const ROW_GAP = 0.25;

export const COLUMN_GAP = 0.25;

// Helper
export interface LayoutRow {

  items: ComposerLayoutItem[];

  rowHeight: number;

}

const roundUpToNiceValue = (value: number) => {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const fraction = value / magnitude;
  const niceFraction = fraction <= 1
    ? 1
    : fraction <= 2
      ? 2
      : fraction <= 5
        ? 5
        : 10;

  return niceFraction * magnitude;
}

export const TwoColumnLayout = (reconstruction: ReconstructionCanvas[]): ComposerLayout => {
  const physicalUnits = new Set(reconstruction.map(canvas => canvas.physicalSize?.unit!).filter(Boolean));

  const usePhysicalSize = reconstruction.length > 0 && physicalUnits.size === 1 &&
    reconstruction.every(canvas => canvas.physicalSize);

  const unit = usePhysicalSize ? physicalUnits.values().next().value : undefined;

  const dimensions = reconstruction.map(canvas =>
    usePhysicalSize && canvas.physicalSize
      ? canvas.physicalSize
      : { width: canvas.width, height: canvas.height });

  const maxWidth = Math.max(0, ...dimensions.map(size => size.width));
  
  const scale = maxWidth > 0 ? 1 / maxWidth : 1;
  const scaledDimensions = dimensions.map(size => ({
    width: size.width * scale,
    height: size.height * scale
  }));

  const leftColumnWidth = Math.max(0, ...scaledDimensions.filter((_, index) => index % 2 === 0).map(size => size.width));
  
  const rightColumnWidth = Math.max(0, ...scaledDimensions.filter((_, index) => index % 2 === 1).map(size => size.width));
  const desiredGap = maxWidth * COLUMN_GAP;
  const rowStartIncrement = maxWidth > 0
    ? roundUpToNiceValue(maxWidth * ROW_GAP / 50) * 10
    : 10;
  const rightColumnX = rightColumnWidth > 0
    ? maxWidth > 0
      ? Math.ceil((leftColumnWidth * maxWidth + desiredGap) / rowStartIncrement) * rowStartIncrement / maxWidth
      : leftColumnWidth + COLUMN_GAP
    : leftColumnWidth;

  const rows: LayoutRow[] = [];

  for (let i = 0; i < reconstruction.length; i += 2) {
    const left = reconstruction[i];
    const right = reconstruction[i + 1];

    const leftSize = scaledDimensions[i];
    const rightSize = right ? scaledDimensions[i + 1] : undefined;
    
    const rowHeight = Math.max(leftSize.height, rightSize?.height ?? 0);

    rows.push({
      items: [
        {
          reconstructionCanvasId: left.id,
          x: 0,
          y: 0,
          width: leftSize.width,
          height: leftSize.height
        },
        ...(right && rightSize ? [{
          reconstructionCanvasId: right.id,
          x: rightColumnX,
          y: 0,
          width: rightSize.width,
          height: rightSize.height
        }] : [])
      ],
      rowHeight
    });
  }

  const items = [];
  let rowY = 0;
  let layoutHeight = 0;

  for (const [index, row] of rows.entries()) {
    for (const item of row.items) {
      items.push({
        ...item,
        y: rowY
      });
    }

    layoutHeight = rowY + row.rowHeight;

    if (index < rows.length - 1) {
      const nextRowStart = layoutHeight + ROW_GAP;
      if (maxWidth > 0) {
        const rowStartInUnits = nextRowStart * maxWidth;
        const incrementCount = rowStartInUnits / rowStartIncrement;
        const roundedIncrementCount = Math.ceil(
          incrementCount - Number.EPSILON * Math.max(1, Math.abs(incrementCount))
        );
        rowY = roundedIncrementCount * rowStartIncrement / maxWidth;
      } else {
        rowY = nextRowStart;
      }
    }
  }

  const physicalScale = unit && maxWidth > 0 ? { unit, physicalUnitsPerOSDUnit: maxWidth }: undefined;

  return {
    items,
    physicalScale,
    gridScale: {
      unit: unit ?? 'px',
      unitsPerOSDUnit: maxWidth > 0 ? maxWidth : 1
    },
    layoutWidth: Math.max(1, rightColumnWidth > 0 ? rightColumnX + rightColumnWidth : leftColumnWidth),
    layoutHeight: Math.max(0, layoutHeight)
  };
}
