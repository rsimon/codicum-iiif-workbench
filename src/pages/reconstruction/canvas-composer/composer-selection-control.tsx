import { IconChevronRight, IconFrame, IconNotes } from '@tabler/icons-react';
import { Button } from '@/shadcn/button';
import { cn } from '@/shadcn/utils';
import type { PhysicalSize, ReconstructionCanvas } from '@/types';
import { useReconstructionStore } from '../reconstruction-store';
import type { DraggableImageSelection } from '../reconstruction-types';
import { useComposerStore } from './composer-store';

const BUTTON_CLASS = 
  'rounded-full border border-neutral-300/80 bg-white py-2 pl-3 pr-2 h-auto gap-1 font-normal text-xs shadow-md hover:bg-neutral-50';

const DIVIDER_CLASS = 
  'h-3.5 w-px shrink-0 bg-neutral-300/80';

const formatPhysicalSize = (size: PhysicalSize): string =>
  `${size.width} × ${size.height} ${size.unit}`;

interface ComposerSelectionControlProps {

  isSidebarOpen: boolean;

  onChangeSidebarOpen(open: boolean): void;

}

export const ComposerSelectionControl = (props: ComposerSelectionControlProps) => {
  const selection = useReconstructionStore(state => state.selection);
  const selectedImage = useComposerStore(state => state.selectedImage);

  const { showLabels } = useComposerStore(state => state.settings);

  const onClick = () => props.onChangeSidebarOpen(!props.isSidebarOpen);

  return selection.length === 1 ? (
    <div className={cn(
      'absolute right-3 z-50 transition-opacity',
      props.isSidebarOpen ? 'opacity-0 pointer-events-none' : undefined,
      showLabels ? 'top-5.5' : 'top-3.5'
    )}>
      {selectedImage ? (
        <ImageSelectionSummary
          selection={selectedImage}
          onClick={onClick} />
      ) : (
        <CanvasSelectionSummary
          canvas={selection[0]}
          onClick={onClick} />
      )}
    </div>
  ) : null;

}

interface CanvasSelectionSummaryProps {

  canvas: ReconstructionCanvas;

  onClick(): void;

}

const CanvasSelectionSummary = (props: CanvasSelectionSummaryProps) => {
  const { width, height, physicalSize } = props.canvas;

  return (
    <Button
      variant="ghost"
      className={BUTTON_CLASS}
      onClick={props.onClick} >
      <IconNotes className="size-4.5 text-muted-foreground/80 shrink-0" />

      <span className="flex items-center gap-2 tabular-nums">
        <span>
          {Math.round(width).toLocaleString()} × {Math.round(height).toLocaleString()} px
        </span>

        {physicalSize && (
          <>
            <span className={DIVIDER_CLASS} />
            <span className="text-muted-foreground">
              {formatPhysicalSize(physicalSize)}
            </span>
          </>
        )}
      </span>

      <IconChevronRight className="size-3.5 text-muted-foreground/80 shrink-0" />
    </Button>
  )

}

interface ImageSelectionSummaryProps {

  selection: DraggableImageSelection;

  onClick(): void;

}

const ImageSelectionSummary = (props: ImageSelectionSummaryProps) => {
  const { image } = props.selection;

  // TODO crop should be shown (and editable!) in summary
  const crop = image.crop ?? {
    x: 0,
    y: 0,
    w: image.resource.width,
    h: image.resource.height
  };

  const aspectRatio = crop.w / crop.h;
  const height = image.width / aspectRatio;

  return (
    <Button
      variant="ghost"
      className={BUTTON_CLASS}
      onClick={props.onClick}>
      <IconFrame className="size-4.5 text-muted-foreground/80 shrink-0" />

      <span className="flex items-center gap-2 tabular-nums">
        <span>
          {Math.round(image.width).toLocaleString()} × {Math.round(height).toLocaleString()} px
        </span>

        <span className={DIVIDER_CLASS} />

        <span className="text-muted-foreground/80">
          x <span className="text-foreground">{Math.round(image.x).toLocaleString()}</span> y <span className="text-foreground">{Math.round(image.y).toLocaleString()}</span>
        </span>
      </span>

      <IconChevronRight className="size-3.5 text-muted-foreground/80 shrink-0" />
    </Button>
  )

}
