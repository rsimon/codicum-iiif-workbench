import type { ButtonProps } from '@base-ui/react';
import { IconArrowBackUp, IconArrowForwardUp, IconCrop, IconMaximize, IconStackPop, IconStackPush } from '@tabler/icons-react';
import { ToolbarToggle } from '@/components/toolbar-toggle';
import { Button } from '@/shadcn/button';
import { Separator } from '@/shadcn/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shadcn/tooltip';
import { useAppStore } from '@/store/app-store';
import { getCanvasImageKey } from '../reconstruction-utils';
import { useComposerStore } from './composer-store';
import { getFillSize, isSelectionFullSize } from './composer-utils';

const ComposerToolbarButton = (props: ButtonProps & { tooltip: string }) => {
  const { children, ...rest } = props;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            className="rounded-full"
            {...rest}>
            {children}
          </Button>
        }/>
      <TooltipContent>
        {props.tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export const ComposerToolbar = () => {
  const selectedImage = useComposerStore(state => state.selectedImage);
  const imagesByCanvasId = useComposerStore(state => state.imagesByCanvasId);

  const updateImage = useComposerStore(state => state.updateImage);
  const changeImageZOrder = useComposerStore(state => state.changeImageZOrder);
  const setIsUserEdit = useComposerStore(state => state.setIsUserEdit);

  const editMode = useComposerStore(state => state.editMode);
  const setEditMode = useComposerStore(state => state.setEditMode);

  const reconstruction = useAppStore(state => state.reconstruction);

  const isFullSize = selectedImage ? isSelectionFullSize(selectedImage, reconstruction) : false;
  const images = selectedImage
    ? imagesByCanvasId.get(selectedImage.item.reconstructionCanvasId) ?? []
    : [];
  const selectedImageIndex = selectedImage
    ? images.findIndex(image =>
      getCanvasImageKey(selectedImage.item.reconstructionCanvasId, image) ===
      getCanvasImageKey(selectedImage.item.reconstructionCanvasId, selectedImage.image))
    : -1;

  const onMoveImage = (direction: 'up' | 'down') => {
    if (!selectedImage) return;
    changeImageZOrder(selectedImage.item.reconstructionCanvasId, selectedImage.image, direction);
  };

  const onFillCanvas = () => {
    if (!selectedImage) return;

    const canvas = reconstruction.find(r => r.id === selectedImage.item.reconstructionCanvasId);
    if (!canvas) return;

    setIsUserEdit(true);

    updateImage(selectedImage.item.reconstructionCanvasId, {
      ...selectedImage.image,
      ...getFillSize(selectedImage.image, canvas)
    });

    requestAnimationFrame(() => setIsUserEdit(false));
  }

  const onToggleCrop = () => {
    if (!selectedImage) return;
    setEditMode(editMode === 'CROP' ? 'RESIZE' : 'CROP');
  };

  return (
    <div className="absolute bottom-8 w-full flex justify-center z-50 pointer-events-none">
      <div className="bg-white flex items-center gap-1 min-w-20 rounded-full p-1 pointer-events-auto
        ring-1 ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.10)]">
        <ComposerToolbarButton
          disabled={!selectedImage || selectedImageIndex < 0 || selectedImageIndex === images.length - 1}
          onClick={() => onMoveImage('up')}
          tooltip="Move image up">
          <IconStackPop className="size-4.5" />
        </ComposerToolbarButton>

        <ComposerToolbarButton
          disabled={!selectedImage || selectedImageIndex <= 0}
          onClick={() => onMoveImage('down')}
          tooltip="Move image down">
          <IconStackPush className="size-4.5" />
        </ComposerToolbarButton>

        <ToolbarToggle
          disabled={!selectedImage}
          tooltip="Crop image"
          onClick={onToggleCrop}
          aria-pressed={editMode === 'CROP'}>
          <IconCrop className="size-5" strokeWidth={1.75} />
        </ToolbarToggle>

        <ComposerToolbarButton
          disabled={!selectedImage || isFullSize}
          tooltip="Adjust image size to fill canvas"
          onClick={onFillCanvas}>
          <IconMaximize className="size-4.5" />
        </ComposerToolbarButton>

        <Separator orientation="vertical" />

        <ComposerToolbarButton
          disabled
          tooltip="Undo">
          <IconArrowBackUp className="size-4.5" />
        </ComposerToolbarButton>

        <ComposerToolbarButton
          disabled
          tooltip="Redo">
          <IconArrowForwardUp className="size-4.5" />
        </ComposerToolbarButton>
      </div>
    </div>
  )

}