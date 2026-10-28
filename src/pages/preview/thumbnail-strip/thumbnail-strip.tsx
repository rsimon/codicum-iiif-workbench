import { useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { IconDownload } from '@tabler/icons-react';
import { ExportReconstructionDialog } from '@/dialogs/export-reconstruction';
import { Button } from '@/shadcn/button';
import { ScrollArea } from '@/shadcn/scroll-area';
import { cn } from '@/shadcn/utils';
import { Thumbnail } from './thumbnail';
import { usePreviewStore } from '../preview-store';

export const ThumbnailStrip = () => {
  const views = usePreviewStore(state => state.views);
  const selectedView = usePreviewStore(state => state.selectedView);

  const setSelectedView = usePreviewStore(state => state.setSelectedView);

  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null);

  const [showExportReconstructionDialog, setShowExportReconstructionDialog] = useState(false);

  const renderView = (idx: number) => {
    const view = views[idx];
    const isSelected = view === selectedView;

    return (
      <button
        className={cn(
          'border border-transparent outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'cursor-pointer flex flex-col @[160px]:flex-row items-center justify-center gap-2.5 p-1 w-full max-w-42 mx-auto rounded',
          idx > 0 && 'mt-2',
          isSelected ? 'ring-2 ring-primary bg-primary/15' : 'hover:ring-2 hover:ring-primary/25'
        )}
        onClick={() => setSelectedView(view)}>
        {view.left && (
          <Thumbnail 
            canvas={view.left} 
            className="max-h-28" />
        )}
        {view.right && (
          <Thumbnail 
            canvas={view.right}
            className="max-h-28" />
        )}
      </button>
    )
  }

  return (
    <>
      <div className="@container flex h-full flex-col bg-muted">
        {views.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
            No reconstruction canvases yet.
          </div>
        ) : (
          <ScrollArea className="grow min-h-0 px-2" viewportRef={setViewportEl}>
            <div className="h-full px-2.5 py-4">
              <Virtuoso
                customScrollParent={viewportEl ?? undefined}
                totalCount={views.length}
                itemContent={renderView} />
            </div>
          </ScrollArea>
        )}

        <div className="p-2.5 border-t">
          <Button 
            className="w-full font-normal"
            size="lg"
            onClick={() => setShowExportReconstructionDialog(true)}>
            <IconDownload /> Export to IIIF
          </Button>
        </div>
      </div>

      <ExportReconstructionDialog
        open={showExportReconstructionDialog}
        onOpenChange={setShowExportReconstructionDialog} />
    </>
  )

}
