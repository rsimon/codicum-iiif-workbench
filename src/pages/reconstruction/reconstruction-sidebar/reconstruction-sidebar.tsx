import { ScrollArea } from '@/shadcn/scroll-area';
import { useReconstructionStore } from '../reconstruction-store';
import { EmptySidebar } from './empty-sidebar/empty-sidebar';
import { MultiSelection } from './multi-selection';
import { SingleSelection } from './single-selection';

interface ReconstructionSidebarProps {

  onClose(): void;

}

export const ReconstructionSidebar = (props: ReconstructionSidebarProps) => {
  const selection = useReconstructionStore(state => state.selection);

  return (
    <ScrollArea className="h-full">
      {selection.length === 0 ? (
        <EmptySidebar 
          onClose={props.onClose} />
      ) : selection.length > 1 ? (
        <MultiSelection
          selection={selection} 
          onClose={props.onClose} />
      ) : (
        <SingleSelection
          canvas={selection[0]}
          onClose={props.onClose} />
      )}
    </ScrollArea>
  )

}