import { useState } from 'react';
import { useLocation } from 'wouter';
import { IconDownload, IconFolderOpen, IconRestore, IconUpload } from '@tabler/icons-react';
import { Button } from '@/shadcn/button';
import { useAppStore } from '@/store/app-store';
import { useConfirm } from '@/dialogs/confirm';
import { ExportReconstructionDialog } from '@/dialogs/export-reconstruction';
import { ImportSourceDialog } from '@/dialogs/import-source';
import { OpenReconstructionDialog } from '@/dialogs/open-reconstruction';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/shadcn/dropdown-menu';

export const Project = () => {
  const reset = useAppStore(state => state.resetAll);

  const [_, navigate] = useLocation();

  const [showOpenReconstructionDialog, _setShowOpenReconstructionDialogState] = useState(false);
  const [showExportReconstructionDialog, setShowExportReconstructionDialog] = useState(false);
  const [showImportSourceDialog, _setShowImportSourceDialogState] = useState(false);

  // Alternative import path: if the user tries to open a regular manifest as a
  // reconstruction, and then decides to import as a source instead
  const [importSourceInstead, setImportSourceInstead] = useState<string | undefined>();

  // Vice versa: if the user tries to import a source that's actually a project,
  // and then decides to open the project
  const [openProjectInstead, setOpenProjectInstead] = useState<string | undefined>();

  const confirm = useConfirm();

  // Reset 'import source' URL any time the 'open reconstruction' dialog is opened/closed
  const setShowOpenReconstructionDialog = (open: boolean) => {
    if (open)
      // Reset 'import as source instead' on open
      setImportSourceInstead(undefined);
    else 
      // Reset 'open as project' otherwise
      setOpenProjectInstead(undefined);
      
    _setShowOpenReconstructionDialogState(open);
  }

  const setShowImportSourceDialog = (open: boolean) => {
    if (open)
      // Reset 'open as project instead' on open
      setOpenProjectInstead(undefined);
    else 
      // Reset 'import as source' otherwise
      setImportSourceInstead(undefined);

    _setShowImportSourceDialogState(open);
  }

  const onReset = () => {
    confirm({
      title: 'Reset project?',
      description: 'This will remove all sources and delete the reconstruction. This action cannot be undone.',
      confirmLabel: 'Reset project',
      variant: 'destructive',
    }).then(confirmed => {
      if (confirmed) { 
        reset();
        navigate('/sources');
      }
    });
  }

  const onImportSourceInstead = (url: string) => {
    setShowOpenReconstructionDialog(false);
    setImportSourceInstead(url);
    setShowImportSourceDialog(true);
  }

  const onOpenProjectInstead = (url: string) => {
    setShowImportSourceDialog(false);
    setOpenProjectInstead(url);
    setShowOpenReconstructionDialog(true);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button
            variant="ghost"
            className="font-normal">
            Project
          </Button>
        } />

        <DropdownMenuContent className="min-w-58">
          <DropdownMenuItem 
            className="gap-2.5"
            onClick={() => setShowOpenReconstructionDialog(true)}>
            <IconFolderOpen /> Open reconstruction...
          </DropdownMenuItem>

          <DropdownMenuItem 
            className="gap-2.5"
            onClick={() => setShowExportReconstructionDialog(true)}>
            <IconDownload /> Export reconstruction...
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            className="gap-2.5"
            onClick={() => setShowImportSourceDialog(true)}>
            <IconUpload /> Import IIIF source...
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="gap-2.5"
            variant="destructive"
            onClick={onReset}>
            <IconRestore /> Reset project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <OpenReconstructionDialog
        open={showOpenReconstructionDialog}
        onOpenChange={setShowOpenReconstructionDialog}
        onImportSourceInstead={onImportSourceInstead} 
        withURL={openProjectInstead} />

      <ImportSourceDialog
        open={showImportSourceDialog}
        onOpenChange={setShowImportSourceDialog}
        onOpenReconstructionInstead={onOpenProjectInstead}
        withURL={importSourceInstead} />

      <ExportReconstructionDialog
        open={showExportReconstructionDialog}
        onOpenChange={setShowExportReconstructionDialog} />
    </>
  )

}