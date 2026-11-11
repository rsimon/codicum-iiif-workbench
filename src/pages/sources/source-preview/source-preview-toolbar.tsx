import { useEffect, useState } from 'react';
import { IconCheck, IconDimensions, IconPlus, IconRulerMeasure } from '@tabler/icons-react';
import type { CozyCanvas, CozyManifest } from 'cozy-iiif';
import { ToolbarToggle } from '@/components/toolbar-toggle';
import { ViewerPaginationControl } from '@/components/viewer-pagination-control';
import { PhysicalDimensionsDialog, useMeasurement } from '@/dialogs/physical-dimensions';
import { Button } from '@/shadcn/button';
import { Separator } from '@/shadcn/separator';
import { useAppStore } from '@/store/app-store';
import { useSourcesStore } from '../sources-store';

interface SourcePreviewToolbarProps {

  isInReconstruction: boolean;

  selectedCanvas: CozyCanvas;

  selectedManifest: CozyManifest;

  selectedPageIndex: number;

  totalPageCount: number;

  onNext(): void;

  onPrevious(): void;

}

export const SourcePreviewToolbar = (props: SourcePreviewToolbarProps) => {
  const isFiltered = useSourcesStore(state => state.showInReconstructionOnly);

  const size = useAppStore(state => state.sizes.get(props.selectedCanvas.id));
  const setSize = useAppStore(state => state.setSourcePhysicalSize);

  const addToReconstruction = useAppStore(state => state.addSourceCanvasToReconstruction);
  const removeFromReconstruction = useAppStore(state => state.removeSourceCanvasFromReconstruction);

  const [showDimensionsDialog, setShowDimensionsDialog] = useState(false);

  const { setEnableTapeMeasure } = useMeasurement();

  const [isTapeMeasurePressed, setIsTapeMeasurePressed] = useState(false);

  useEffect(() => setIsTapeMeasurePressed(false), [props.selectedCanvas])

  const onShowDimensionsDialog = (open: boolean) => {
    setIsTapeMeasurePressed(false);
    setShowDimensionsDialog(open);
  }

  const onPressTapeMeasure = (pressed: boolean) => {
    setIsTapeMeasurePressed(pressed);
    setEnableTapeMeasure(pressed, { 
      showLabel: true,
      canvasSize: size
    })
  }

  useEffect(() => {
    if (!isTapeMeasurePressed) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape')
        onPressTapeMeasure(false);
    }

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    }
  }, [isTapeMeasurePressed]);

  return (
    <div className="absolute px-4 bottom-8 w-full flex justify-center z-50 pointer-events-none">
      <div className="bg-white flex items-center gap-1 min-w-20 rounded-full p-1.5 pointer-events-auto
        ring-1 ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.10)]">
        <ViewerPaginationControl 
          displayAsFiltered={isFiltered}
          selectedPageIndex={props.selectedPageIndex}
          selectedPageLabel={props.selectedCanvas.getLabel()}
          totalPageCount={props.totalPageCount}
          onNext={props.onNext}
          onPrevious={props.onPrevious} />

        <Separator orientation="vertical" />

        <PhysicalDimensionsDialog
          canvasLabel={props.selectedCanvas.getLabel()}
          canvasWidth={props.selectedCanvas.width}
          canvasHeight={props.selectedCanvas.height}
          physicalSize={size}
          open={showDimensionsDialog}
          onOpenChange={onShowDimensionsDialog}
          onSizeChanged={size => setSize(props.selectedCanvas.id, size)}>
          {size ? (
            <Button
              variant="ghost"
              className="rounded-full shrink min-w-12 font-normal text-xs text-muted-foreground">
              <IconDimensions /> 
              <span className="min-w-0 shrink truncate">{size.width} x {size.height} {size.unit}</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              className="rounded-full shrink min-w-12 border-primary/50 border-dashed font-normal text-primary hover:text-primary aria-expanded:text-primary">
              <IconPlus /> <span className="min-w-0 shrink truncate">Set dimensions</span>
            </Button>
          )}
        </PhysicalDimensionsDialog>

        <ToolbarToggle
          disabled={!size || showDimensionsDialog}
          tooltip="Measure"
          pressed={isTapeMeasurePressed}
          onPressedChange={onPressTapeMeasure}>
          <IconRulerMeasure className="size-4.5" />
        </ToolbarToggle>

        <Separator orientation="vertical" />

        {props.isInReconstruction ? (
          <Button
            className="rounded-full font-normal pr-3 shrink min-w-12"
            onClick={() => removeFromReconstruction(props.selectedCanvas.id)}>
            <IconCheck /> <span className="min-w-0 shrink truncate">In Reconstruction</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            className="rounded-full font-normal pr-3 shrink min-w-12 shadow-none border-primary/50 text-primary hover:bg-accent/40 hover:text-primary"
            onClick={() => addToReconstruction(props.selectedManifest.id, props.selectedCanvas)}>
            <IconPlus /> <span className="min-w-0 shrink truncate">Add to Reconstruction</span>
          </Button>
        )}
      </div>
    </div>
  )

}