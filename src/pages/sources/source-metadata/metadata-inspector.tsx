import type { CozyCanvas, CozyManifest } from 'cozy-iiif';
import { MetadataSection } from '@/components/metadata-section';
import { ScrollArea } from '@/shadcn/scroll-area';
import { useAppStore } from '@/store/app-store';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import { Button } from '@/shadcn/button';

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
              <div>
                <h3 className="text-xs text-muted-foreground uppercase">Pixel Size</h3>
                <div className="tabular-nums">
                  {canvas.width.toLocaleString()} × {canvas.height.toLocaleString()} px
                </div>
              </div>

              <div>
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

  return size ? (
    <div className="flex gap-0.5 items-center tabular-nums">
      {size.width.toLocaleString()} × {size.height.toLocaleString()} {size.unit}
      <Button
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground"
        onClick={props.onSetSize}>
        <IconPencil className="size-3.5 mb-0.5" />
      </Button>
    </div>
  ) : (
    <button
      type="button"
      onClick={props.onSetSize}
      className="text-primary mt-px flex gap-0.5 items-center hover:underline cursor-pointer underline-offset-2 decoration-dotted">
      <IconPlus className="size-3.5" /> Set dimensions
    </button>
  )

} 