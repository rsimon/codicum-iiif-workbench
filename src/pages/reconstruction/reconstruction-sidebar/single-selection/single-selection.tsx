import { IconLayoutSidebarRight, IconStack2 } from '@tabler/icons-react';
import { Button } from '@/shadcn/button';
import { FieldGroup, FieldLegend, FieldSet } from '@/shadcn/field';
import { useAppStore } from '@/store/app-store';
import type { PhysicalSize, ReconstructionCanvas } from '@/types';
import type { DraggableImageSelection } from '../../reconstruction-types';
import { useComposerStore } from '../../canvas-composer/composer-store';
import { withHistory } from '../../reconstruction-history';
import { EditablePixelSize } from './editable-pixel-size';
import { EditablePhysicalSize } from './editable-physical-size';
import { EditableImagePosition } from './editable-image-position';

interface SingleSelectionProps {

  canvas: ReconstructionCanvas;

  imageSelection?: DraggableImageSelection;

  onClose(): void;

}

export const SingleSelection = (props: SingleSelectionProps) => {
  const { canvas } = props;

  const { width, height } = canvas;

  const resizeCanvas = useAppStore(state => state.resizeCanvas);
  const setPhysicalSize = useAppStore(state => state.setReconstructionPhysicalSize);

  const updateImage = useComposerStore(state => state.updateImage);
  const setIsUserEdit = useComposerStore(state => state.setIsUserEdit);

  const selectedImage = props.imageSelection?.item.reconstructionCanvasId === canvas.id
    ? props.imageSelection.image
    : undefined; // Just being defensive - should never happen

  const onResizeCanvasPx = (newWidth: number, newHeight: number) => {
    if (newWidth === Math.round(width) && newHeight === Math.round(height)) return;
    withHistory(() => resizeCanvas(canvas.id, newWidth, newHeight));
  }

  const onResizeCanvasPhys = (size: PhysicalSize) =>
    withHistory(() => setPhysicalSize(canvas.id, size));

  const onChangeImagePosition = (x: number, y: number, width: number) => {
    if (!selectedImage) return;
    setIsUserEdit(true);
    updateImage(canvas.id, { ...selectedImage, x, y, width });
    requestAnimationFrame(() => setIsUserEdit(false));
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between border-b py-1 pl-4 pr-1 items-center overflow-hidden">
        <h2 className="flex shrink min-w-0 items-center gap-1.5">
          {canvas.type === 'composite' && (
            <IconStack2 className="size-5 text-muted-foreground shrink-0" stroke={1.75} />
          )}
          <span className="text-base truncate">{canvas.label}</span>
        </h2>

        <Button
          variant="ghost"
          className="shrink-0 text-muted-foreground/80"
          onClick={props.onClose}>
          <IconLayoutSidebarRight className="size-4.5" />
        </Button>
      </div>

      <FieldGroup className="p-4 gap-4">
        <FieldSet className="gap-1 items-start space-y-0.5">
          <FieldLegend variant="label" className="data-[variant=label]:text-xs uppercase font-normal text-muted-foreground">
            Image size
          </FieldLegend>
          <EditablePixelSize
            width={width}
            height={height}
            onCommit={onResizeCanvasPx} />
        </FieldSet>

        <FieldSet className="gap-1 items-start space-y-0.5">
          <FieldLegend variant="label" className="data-[variant=label]:text-xs  uppercase font-normal text-muted-foreground">
            Physical size
          </FieldLegend>
          <EditablePhysicalSize
            size={canvas.physicalSize}
            onCommit={onResizeCanvasPhys} />
        </FieldSet>
      </FieldGroup>

      {selectedImage && (
        <EditableImagePosition
          image={selectedImage}
          onCommit={onChangeImagePosition} />
      )}
    </div>
  )

}