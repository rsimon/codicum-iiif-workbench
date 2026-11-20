import { ScrollArea } from '@/shadcn/scroll-area';
import type { ReconstructionCanvas } from '@/types';
import { usePreviewStore } from '../preview-store';
import { MetadataSection } from '@/components/metadata-section';
import { IconAlignBoxRightTop, IconSquare } from '@tabler/icons-react';

const getSources = (canvas?: ReconstructionCanvas) => {
  if (!canvas) return [];
  return canvas.type === 'original' ? [canvas.source] : canvas.sources;
}

export const PreviewMetadata = () => {
  const view = usePreviewStore(state => state.selectedView);

  const leftSources = getSources(view?.left);
  const rightSources = getSources(view?.right);

  return view ? (
    <div className="h-full flex flex-col">
      <ScrollArea className="grow min-h-0">
        <div>
          {view.left && (
            <div className="border-b p-3.5">
              <div className="pb-2">
                <h2 className="text-xs uppercase text-muted-foreground flex gap-1 items-center">
                  <div className="flex gap-0 items-center">
                    <IconAlignBoxRightTop className="size-4.5" /> 
                    <IconSquare className="size-4.5 text-muted-foreground/40 -ml-0.5" /> 
                  </div>
                  Left
                </h2>
              </div>

              {leftSources.map(source => (
                <div key={source.canvas.id}>
                  <h3>
                    {source.canvas.getLabel()}
                  </h3>

                  <MetadataSection metadata={source.canvas.getMetadata()} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          {view.right && (
            <div className="border-b p-3.5">
              <div className="pb-2">
                <h2 className="text-xs uppercase text-muted-foreground flex gap-1 items-center">
                  <div className="flex gap-0 items-center">
                    <IconSquare className="size-4.5 text-muted-foreground/40"  /> 
                    <IconAlignBoxRightTop className="size-4.5 -ml-0.5" />
                  </div>
                  Right
                </h2>
              </div>

              {rightSources.map(source => (
                <div key={source.canvas.id}>
                  <h3>
                    {source.canvas.getLabel()}
                  </h3>

                  <MetadataSection metadata={source.canvas.getMetadata()} />
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  ) : null;

}