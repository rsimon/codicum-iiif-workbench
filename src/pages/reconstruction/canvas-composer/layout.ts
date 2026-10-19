import type { ReconstructionCanvas } from '@/types';
import type { ComposerLayout, ComposerLayoutItem } from '../reconstruction-types';

export const ROW_GAP = 0.25;

export const COLUMN_GAP = 0.25;

// Helper
export interface LayoutRow {

  items: ComposerLayoutItem[];

  rowHeight: number;

}

export const TwoColumnLayout = (reconstruction: ReconstructionCanvas[]): ComposerLayout => {
  const physicalUnits = new Set(reconstruction.map(canvas => canvas.physicalSize?.unit!).filter(Boolean));

  const usePhysicalSize = physicalUnits.size === 1 && // require same unit on all canvases!
    reconstruction.every(canvas => canvas.physicalSize);

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
  const rightColumnX = leftColumnWidth + COLUMN_GAP;

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
          x: (leftColumnWidth - leftSize.width) / 2,
          y: 0,
          width: leftSize.width,
          height: leftSize.height
        },
        ...(right && rightSize ? [{
          reconstructionCanvasId: right.id,
          x: rightColumnX + (rightColumnWidth - rightSize.width) / 2,
          y: 0,
          width: rightSize.width,
          height: rightSize.height
        }] : [])
      ],
      rowHeight
    });
  }

  let currentY = 0;

  const items = [];

  for (const row of rows) {
    for (const item of row.items) {
      items.push({
        ...item,
        y: currentY + (row.rowHeight - item.height) / 2
      });
    }
    currentY += row.rowHeight + ROW_GAP;
  }

  return {
    items,
    layoutWidth: Math.max(1, leftColumnWidth + (rightColumnWidth > 0 ? COLUMN_GAP + rightColumnWidth : 0)),
    layoutHeight: Math.max(0, currentY - ROW_GAP)
  };
}
