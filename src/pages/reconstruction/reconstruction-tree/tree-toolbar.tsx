import { IconArrowMerge } from '@tabler/icons-react';
import { PanelActionButton } from '@/components/panel-action-button';
import { useAppStore } from '@/store/app-store';
import { withHistory } from '../reconstruction-history';
import { useReconstructionStore } from '../reconstruction-store';

export const ReconstructionTreeToolbar = () => {
  const merge = useAppStore(state => state.mergeCanvases);
  const selected = useReconstructionStore(state => state.selection);

  return (
    <div className="text-muted-foreground py-2 pl-1 pr-3.5 flex justify-end bg-white border-b">
      <div className="flex items-center gap-1.5">
        <PanelActionButton
          disabled={selected.length < 2}
          tooltip="Merge selected canvases"
          onClick={() => withHistory(() => merge(selected))}>
          <IconArrowMerge className="size-4" />
        </PanelActionButton>
      </div>
    </div>
  )

}