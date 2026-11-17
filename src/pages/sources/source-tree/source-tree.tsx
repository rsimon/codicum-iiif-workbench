import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { IconUpload } from '@tabler/icons-react';
import { GroupedVirtuoso } from 'react-virtuoso';
import type { CozyCanvas } from 'cozy-iiif';
import { Badge } from '@/shadcn/badge';
import { Button } from '@/shadcn/button';
import { ScrollArea } from '@/shadcn/scroll-area';
import { TooltipProvider } from '@/shadcn/tooltip';
import { cn } from '@/shadcn/utils';
import { ImportSourceDialog } from '@/dialogs/import-source';
import { useAppStore } from '@/store/app-store';
import { useSourcesStore } from '../sources-store';
import { EmptySourceTree } from './empty-source-tree';
import { CanvasTreeItem, ManifestTreeItem } from './source-tree-item';
import { SourceTreeToolbar } from './source-tree-toolbar';
import { useSourceNavigation } from '../use-source-navigation';
import { OpenReconstructionDialog } from '@/dialogs/open-reconstruction';

export const SourceTree = () => {
  const sources = useAppStore(state => state.sources);

  const addCanvas = useAppStore(state => state.addSourceCanvasToReconstruction);
  const removeCanvas = useAppStore(state => state.removeSourceCanvasFromReconstruction);

  const collapsed = useSourcesStore(state => state.collapsed);
  const toggle = useSourcesStore(state => state.toggleSourceExpanded);

  const selection = useSourcesStore(state => state.selection);
  const setSelection = useSourcesStore(state => state.setSelection);

  const [showImportSourceDialog, _setShowImportSourceDialog] = useState(false);
  const [showOpenReconstructionDialog, _setShowOpenReconstructionDialog] = useState(false);

  // Alternative import path: if the user tries to open a regular manifest as a
  // reconstruction, and then decides to import as a source instead
  const [importAsSourceInstead, setImportAsSourceInstead] = useState<string | undefined>();

  const setShowImportSourceDialog = (open: boolean) => {
    if (!open)
      setImportAsSourceInstead(undefined);
    _setShowImportSourceDialog(open);
  }

  const setShowOpenReconstructionDialog = (open: boolean) => {
    if (open)
      setImportAsSourceInstead(undefined);
    _setShowOpenReconstructionDialog(open);
  }

  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null);

  const { 
    reconstruction,
    filteredSources,
    countCanvasesInReconstruction, 
    isInReconstruction,
    sourceCanvasesInReconstruction,
  } = useSourceNavigation();

  // No. of visible canvas rows per manifest
  const groupCounts = useMemo(() =>
    sources.map((source, idx) =>
      !collapsed.has(source.manifest.id) ? filteredSources[idx].canvases.length : 0
    ), [sources, filteredSources, collapsed]);

  // No. of items before each group, to map the flat GroupedVirtuoso index
  // back to a canvas index inside the manifest
  const groupOffsets = useMemo(() =>
    groupCounts.reduce<{ offsets: number[]; total: number }>(
      ({ offsets, total }, count) => ({
        offsets: [...offsets, total],
        total: total + count,
      }),
      { offsets: [], total: 0 }
    ).offsets, [groupCounts]);

  const onSetCanvasInReconstruction = (sourceManifestId: string, canvas: CozyCanvas, isInReconstruction: boolean) => {
    if (isInReconstruction)
      addCanvas(sourceManifestId, canvas);
    else
      removeCanvas(canvas.id);
  }

  const renderManifestGroup = (idx: number) => {
    const source = sources[idx];
    return (
      <ManifestTreeItem
        source={source}
        isCollapsed={collapsed.has(source.manifest.id)}
        isSelected={selection?.manifestId === source.manifest.id && !selection?.canvasId}
        inReconstruction={countCanvasesInReconstruction(source.manifest.id)}
        onToggleExpanded={() => toggle(source.manifest.id)} />
    )
  }

  const renderCanvasRow = (idx: number, groupIdx: number) => {
    const source = sources[groupIdx];

    const canvasIndex = idx - groupOffsets[groupIdx];
    const canvas = filteredSources[groupIdx].canvases[canvasIndex];
       
    return (
      <div className={cn('pl-0.5', canvasIndex > 0 && 'pt-1')}>
        <CanvasTreeItem
          canvas={canvas}
          isSelected={selection?.manifestId === source.manifest.id && selection?.canvasId === canvas.id}
          isInReconstruction={isInReconstruction(source.manifest.id, canvas.id)}
          onSelect={() => setSelection({ manifestId: source.manifest.id, canvasId: canvas.id })}
          onSetInReconstruction={isAdded => onSetCanvasInReconstruction(source.manifest.id, canvas, isAdded)} />
      </div>
    )
  }

  const onImportAsSourceInstead = (url: string) => {
    setImportAsSourceInstead(url);
    setShowOpenReconstructionDialog(false);
    setShowImportSourceDialog(true);
  }

  const canContinue = sourceCanvasesInReconstruction > 0;

  return (
    <div className="flex flex-col h-full">
      <SourceTreeToolbar />

      {sources.length === 0 ? (
        <EmptySourceTree
          onImportSource={() => setShowImportSourceDialog(true)}
          onOpenProject={() => setShowOpenReconstructionDialog(true)} />
      ) : (
        <>
          <ScrollArea className="grow min-h-0" viewportRef={setViewportEl}>
            <div className="py-2.5 pl-1 pr-2.5">
              <TooltipProvider delay={500}>
                <GroupedVirtuoso
                  customScrollParent={viewportEl ?? undefined}
                  groupCounts={groupCounts}
                  components={{
                    Group: ({ style, ...rest}) => (
                      <div {...rest} style={{...style}} />
                    )
                  }}
                  groupContent={renderManifestGroup} 
                  itemContent={renderCanvasRow} />
              </TooltipProvider>
            </div>
          </ScrollArea>

          <div className="p-2.5 border-t">
            <Link 
              href="/reconstruction"
              aria-disabled={!canContinue}
              tabIndex={canContinue ? undefined : -1}
              onClick={e => { if (!canContinue) e.preventDefault(); }}
              className={cn(
                'cursor-pointer flex items-center justify-center rounded-md border border-transparent text-sm w-full whitespace-nowrap transition-all',
                'outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px', 
                '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4 bg-primary text-primary-foreground hover:bg-primary/80',
                'h-10 gap-1.5 px-2.5',
                canContinue ? undefined : 'pointer-events-none opacity-30'
              )}>
              <span className="truncate">Continue to Reconstruction</span>
              {reconstruction.length > 0 && (
                <Badge 
                  className="bg-white/25">
                  {reconstruction.length}
                </Badge>
              )}
            </Link>

            <Button 
              className="w-full font-normal mt-1.5"
              variant="outline"
              onClick={() => setShowImportSourceDialog(true)}>
              <IconUpload /> Import IIIF source...
            </Button>
          </div>
        </>
      )}

      <ImportSourceDialog 
        open={showImportSourceDialog} 
        onOpenChange={setShowImportSourceDialog} 
        withURL={importAsSourceInstead} />

      <OpenReconstructionDialog
        open={showOpenReconstructionDialog}
        onOpenChange={setShowOpenReconstructionDialog}
        onImportInstead={onImportAsSourceInstead} />
    </div>

  )

}