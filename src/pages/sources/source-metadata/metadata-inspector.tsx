import { IconPencil, IconPlus } from '@tabler/icons-react';
import type { CozyCanvas, CozyManifest } from 'cozy-iiif';
import { MetadataSection } from '@/components/metadata-section';
import { getPPI } from '@/dialogs/physical-dimensions';
import { Button } from '@/shadcn/button';
import { ScrollArea } from '@/shadcn/scroll-area';
import { useAppStore } from '@/store/app-store';

interface MetadataInspectorProps {

  manifest: CozyManifest;

  canvas?: CozyCanvas;

  onSetSize(): void;

}

export const MetadataInspector = (props: MetadataInspectorProps) => {

  const { manifest, canvas } = props;

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="grow min-h-0">
        {canvas && (
          <div className="border-b p-3.5 space-y-3.5">
            <h2 className="pb-2">
              <div className="text-xs uppercase text-muted-foreground">
                Current Item
              </div>

              <div>
                {canvas.getLabel()}
              </div>
            </h2>

            <div className="leading-relaxed text-sm space-y-3.5">
              <div className="space-y-0.5">
                <h3 className="text-xs text-muted-foreground uppercase">Pixel Size</h3>
                <div className="tabular-nums">
                  {canvas.width.toLocaleString()} × {canvas.height.toLocaleString()} px
                </div>
              </div>

              <div className="space-y-0.5">
                <h3 className="text-xs text-muted-foreground uppercase">Physical Size</h3>
                <CanvasPhysicalSize 
                  canvas={canvas} 
                  onSetSize={props.onSetSize} />
              </div>
            </div>

            <MetadataSection metadata={canvas.getMetadata()} />
          </div>
        )}

        <div className="p-3.5">
          <div className="pb-2">
            <h2 className="text-xs uppercase text-muted-foreground">
              Resource
            </h2>
          </div>

          <h3>{manifest.getLabel() ?? 'Manifest'}</h3>

          <MetadataSection
            metadata={manifest.getMetadata()} />
        </div>
      </ScrollArea>
    </div>
  )

}

interface CanvasPhysicalSizeProps {

  canvas: CozyCanvas;

  onSetSize(): void;

}

const CanvasPhysicalSize = (props: CanvasPhysicalSizeProps) => {
  const size = useAppStore(state => state.sizes.get(props.canvas.id));

  const ppi = size ? getPPI(size, props.canvas) : undefined;

  return size ? (
    <div className="space-y-0.5">
      <div className="flex gap-0.75 items-center tabular-nums">
        {size.width.toLocaleString()} × {size.height.toLocaleString()} {size.unit}
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground p-1  size-5.5 focus-visible:ring-2"
          onClick={props.onSetSize}>
          <IconPencil className="size-3.5 mb-0.5" />
        </Button>
      </div>
      {ppi && (
        <p className="text-xs text-muted-foreground">
          ≈ {(Math.round(100 * ppi) / 100).toLocaleString()} ppi
        </p>
      )}
    </div>
  ) : (
    <button
      type="button"
      onClick={props.onSetSize}
      className="text-primary rounded mt-px pr-1.5 pl-0.5 -ml-0.5 flex gap-0.5 items-center hover:underline cursor-pointer underline-offset-2 decoration-dotted
        outline-none border border-transparent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
      <IconPlus className="size-3.5" /> Set dimensions
    </button>
  )

} 