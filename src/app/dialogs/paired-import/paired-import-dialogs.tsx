import { useState } from 'react';
import { OpenReconstructionDialog } from '../open-reconstruction';
import { ImportSourceDialog } from '../import-source';

interface PairedImportDialogsProps {

  openImportSource: boolean;

  onImportSourceOpenChange(open: boolean): void;

  openReconstruction: boolean;

  onReconstructionOpenChange(open: boolean): void;
  
}

export const PairedImportDialogs = (props: PairedImportDialogsProps) => {

  // Alternative import path: if the user tries to open a regular manifest as a
  // reconstruction, and then decides to import as a source instead
  const [importSourceInstead, setImportSourceInstead] = useState<string | undefined>();

  // Vice versa: if the user tries to import a source that's actually a project,
  // and then decides to open the project
  const [openProjectInstead, setOpenProjectInstead] = useState<string | undefined>();

  const setOpenReconstruction = (open: boolean) => {
    if (open)
      setImportSourceInstead(undefined);
    else 
      setOpenProjectInstead(undefined);
      
    props.onReconstructionOpenChange(open);
  }

  const setOpenImportSource = (open: boolean) => {
    if (open)
      setOpenProjectInstead(undefined);
    else 
      setImportSourceInstead(undefined);

    props.onImportSourceOpenChange(open);
  }

  const onImportSourceInstead = (url: string) => {
    setOpenReconstruction(false);
    setImportSourceInstead(url);
    setOpenImportSource(true);
  }

  const onOpenProjectInstead = (url: string) => {
    setOpenImportSource(false);
    setOpenProjectInstead(url);
    setOpenReconstruction(true);
  }

  return (
    <>
      <OpenReconstructionDialog
        open={props.openReconstruction}
        onOpenChange={setOpenReconstruction}
        onImportSourceInstead={onImportSourceInstead} 
        withURL={openProjectInstead} />

      <ImportSourceDialog
        open={props.openImportSource}
        onOpenChange={setOpenImportSource}
        onOpenReconstructionInstead={onOpenProjectInstead}
        withURL={importSourceInstead} />
    </>
  )

}