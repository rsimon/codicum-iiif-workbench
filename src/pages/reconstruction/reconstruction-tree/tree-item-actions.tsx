import { cn, withStopPropagation } from '@/shadcn/utils';
import { useAppStore } from '@/store/app-store';
import type { ReconstructionCanvas } from '@/types';
import { withHistory, withHistoryViewTransition } from '../reconstruction-history';
import {
  IconArrowBarToDown,
  IconArrowBarToUp,
  IconArrowDown,
  IconArrowUp,
  IconCircleMinus,
  IconCopyPlus,
  IconDots,
  IconPencil
} from '@tabler/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/shadcn/dropdown-menu';

interface ReconstructionTreeItemProps {

  className?: string;

  item: ReconstructionCanvas;

  onRenameCanvas(): void;

}

export const ReconstructionTreeItemActions = (props: ReconstructionTreeItemProps) => {
  const duplicateCanvas = useAppStore(state => state.duplicateCanvas);
  const moveCanvas = useAppStore(state => state.moveCanvas);
  const removeCanvas = useAppStore(state => state.removeCanvasFromReconstruction);
  
  const index = useAppStore(state => state.reconstruction.findIndex(r => r.id === props.item.id));
  const total = useAppStore(state => state.reconstruction.length);

  const isFirst = index <= 0;
  const isLast = index === total - 1;

  const onMove = (direction: 'up' | 'down' | 'top' | 'bottom') =>
    withHistoryViewTransition(() => moveCanvas(props.item.id, direction));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={withStopPropagation(e => e.preventDefault())}
        className={cn(
          'rounded-full relative -top-0.5 p-1 opacity-0 focus-visible:opacity-100 group-hover:opacity-100 data-popup-open:opacity-100 text-muted-foreground/80 hover:text-foreground cursor-pointer',
          props.className
        )}>
        <IconDots className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        onClick={withStopPropagation()}>
        <DropdownMenuItem
          onClick={props.onRenameCanvas}>
          <IconPencil /> Rename canvas
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => withHistory(() => duplicateCanvas(props.item.id))}>
          <IconCopyPlus /> Duplicate canvas
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={isFirst}
          onClick={() => onMove('top')}>
          <IconArrowBarToUp /> Move to top
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={isFirst}
          onClick={() => onMove('up')}>
          <IconArrowUp /> Move up
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={isLast}
          onClick={() => onMove('down')}>
          <IconArrowDown /> Move down
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={isLast}
          onClick={() => onMove('bottom')}>
          <IconArrowBarToDown /> Move to bottom
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onClick={() => withHistory(() => removeCanvas(props.item.id))}>
          <IconCircleMinus /> Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

}