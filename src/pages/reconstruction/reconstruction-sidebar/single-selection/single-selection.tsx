import { IconLayoutSidebarRight, IconStack2, IconTrash, IconTypography } from '@tabler/icons-react';
import { Button } from '@/shadcn/button';
import { FieldGroup, FieldLegend, FieldSet } from '@/shadcn/field';
import { useAppStore } from '@/store/app-store';
import type { PhysicalSize, ReconstructionCanvas } from '@/types';
import type { DraggableImageSelection } from '../../reconstruction-types';
import { useComposerStore } from '../../canvas-composer/composer-store';
import { withHistory } from '../../reconstruction-history';
import { useReconstructionStore } from '../../reconstruction-store';
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
  const selectedTextAnnotation = useComposerStore(state => state.selectedTextAnnotation);
  const setSelectedTextAnnotation = useComposerStore(state => state.setSelectedTextAnnotation);
  const setSelectedImage = useComposerStore(state => state.setSelectedImage);
  const setSelection = useReconstructionStore(state => state.setSelection);

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

  const onSelectAnnotation = (annotationId: string) => {
    setSelectedImage();
    setSelectedTextAnnotation({ canvasId: canvas.id, annotationId });
  }

  const onDeleteAnnotation = (annotationId: string) => {
    withHistory(() => {
      const { reconstruction, updateReconstruction } = useAppStore.getState();
      const currentCanvas = reconstruction.find(item => item.id === canvas.id);
      if (!currentCanvas) return;

      const annotations = currentCanvas.annotations ?? [];
      if (!annotations.some(annotation => annotation.id === annotationId)) return;

      updateReconstruction(reconstruction.map(item => item.id === canvas.id
        ? { ...item, annotations: annotations.filter(annotation => annotation.id !== annotationId) }
        : item));
    });

    if (selectedTextAnnotation?.canvasId === canvas.id && selectedTextAnnotation.annotationId === annotationId)
      setSelectedTextAnnotation();

    setSelection([useAppStore.getState().reconstruction.find(item => item.id === canvas.id) ?? canvas]);
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

      {(canvas.annotations?.length ?? 0) > 0 && (
        <FieldSet className="gap-1 items-start space-y-0.5 border-t pt-3">
          <FieldLegend variant="label" className="data-[variant=label]:text-xs uppercase font-normal text-muted-foreground">
            Text annotations
          </FieldLegend>
          <div className="w-full space-y-1 px-3 pb-3">
            {canvas.annotations?.map(annotation => {
              const isSelected = selectedTextAnnotation?.canvasId === canvas.id &&
                selectedTextAnnotation.annotationId === annotation.id;

              return (
                <div
                  key={annotation.id}
                  className={`flex min-w-0 items-center gap-1 rounded-md ${isSelected ? 'bg-muted' : 'hover:bg-muted/60'}`}>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto min-w-0 flex-1 justify-start gap-2 px-2 py-1.5 text-left font-normal"
                    aria-pressed={isSelected}
                    onClick={() => onSelectAnnotation(annotation.id)}>
                    <IconTypography className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-xs">
                      {annotation.text.trim() || 'Untitled text'}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="mr-1 text-muted-foreground hover:text-destructive"
                    aria-label={`Delete text annotation ${annotation.text.trim() || 'Untitled text'}`}
                    title="Delete annotation"
                    onClick={() => onDeleteAnnotation(annotation.id)}>
                    <IconTrash className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </FieldSet>
      )}

      {selectedImage && (
        <EditableImagePosition
          image={selectedImage}
          onCommit={onChangeImagePosition} />
      )}
    </div>
  )

}