import { useState } from 'react';
import { IconUpload } from '@tabler/icons-react';
import { useConfirm } from '../confirm';
import { PairedImportDialogs } from '../paired-import';
import { Button } from '@/shadcn/button';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/shadcn/dialog';
import { Checkbox } from '@/shadcn/checkbox';
import { Label } from '@/shadcn/label';
import { useAppStore } from '@/store/app-store';
import { useSplashStore } from './splash-store';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/shadcn/carousel';

const SPLASH_CONTENT = [{
  title: '1. Select Sources',
  content: 'Import IIIF sources, preview, and pick the canvases you need.'
},{
  title: '2. Compose',
  content: 'Arrange, reorder, and create composites from multiple images in the Canvas Composer.'
},{
  title: '3. Preview and Export',
  content: 'Review your reconstruction and export it as a IIIF manifest.'
}];

export const Splash = () => {
  const dismissed = useSplashStore(state => state.dismissed);
  const setDismissed = useSplashStore(state => state.setDismissed);

  const [open, setOpen] = useState(!dismissed);

  const hasSources = useAppStore(state => state.sources.length > 0);
  const reset = useAppStore(state => state.resetAll);

  const [showImportSourceDialog, setShowImportSourceDialog] = useState(false);
  const [showOpenReconstructionDialog, setShowOpenReconstructionDialog] = useState(false);

  const confirm = useConfirm();

  const onImportFirstSource = () => {
    setShowImportSourceDialog(true);
    setOpen(false);
  }

  const onStartNewReconstruction = () => {
    confirm({
      title: 'Start from scratch?',
      description: 'This will remove all currently imported sources and delete the current reconstruction. This action cannot be undone.',
      confirmLabel: 'Start new project',
      variant: 'destructive',
    }).then(confirmed => {
      if (confirmed) reset();
      setOpen(false);
    });
  }

  return (
    <>
      <Dialog 
        modal
        open={open} 
        onOpenChange={setOpen}>
        <DialogContent
          className="min-w-2xl gap-3"
          showCloseButton={false}>
          <DialogTitle 
            className="tracking-wide text-xl">
            Welcome to the IIIF Manuscript Workbench
          </DialogTitle>

          <p className="text-muted-foreground leading-relaxed">
            Rebuild manuscripts virtually — combine canvases from any IIIF source into
            a single manifest that opens in any IIIF viewer.
          </p>

          <div className="pt-20 pb-28 px-14">
            <Carousel>
              <CarouselContent className="p-2">
                {SPLASH_CONTENT.map(({ title, content }) => (
                  <CarouselItem
                    key={title}
                    className="leading-relaxed">
                    <div className="p-4 rounded-md border h-full">
                      <h3 className="font-medium">{title}</h3>
                      <p>
                        {content}
                      </p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>

          {hasSources ? (
            <div className="flex flex-col w-full">
              <Button
                size="lg"
                className="h-11 grow"
                onClick={() => setOpen(false)}>
                Resume your reconstruction
              </Button>

              <Button
                size="lg"
                variant="link"
                className="h-11 grow"
                onClick={onStartNewReconstruction}>
                Start a new reconstruction
              </Button>
            </div>
          ) : (
            <Button
              size="lg"
              className="gap-2.5 h-11"
              onClick={onImportFirstSource}>
              <IconUpload className="size-5" /> Import your first source
            </Button>
          )}

          <DialogFooter className="justify-center sm:justify-center">
            <Label className="text-xs font-normal text-muted-foreground">
              <Checkbox
                checked={dismissed}
                onCheckedChange={setDismissed} />
              Don't show this message again
            </Label>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PairedImportDialogs
        openImportSource={showImportSourceDialog}
        onImportSourceOpenChange={setShowImportSourceDialog}
        openReconstruction={showOpenReconstructionDialog}
        onReconstructionOpenChange={setShowOpenReconstructionDialog} />
    </>
  )

}
