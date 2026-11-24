import { IconCircleMinus, IconDots } from '@tabler/icons-react';
import { useConfirm } from '@/app/dialogs/confirm';
import { useAppStore } from '@/store/app-store';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/shadcn/dropdown-menu';

interface SourceTreeItemActionsProps {

  manifestId: string;

}

export const SourceTreeItemActions = (props: SourceTreeItemActionsProps) => {
  const removeSource = useAppStore(state => state.removeSource);

  const confirm = useConfirm();

  const onRemoveManifest = () => {
    confirm({
      title: 'Remove manifest?',
      description: 'This will remove the manifest from the project.',
      confirmLabel: 'Remove',
      variant: 'destructive',
    }).then(confirmed => {
      if (confirmed)
        removeSource(props.manifestId);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        className="invisible absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground/80 hover:text-foreground cursor-pointer group-hover:visible group-hover:static group-hover:top-auto group-hover:translate-y-0 data-popup-open:visible data-popup-open:static data-popup-open:top-auto data-popup-open:translate-y-0">
        <IconDots className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent alignOffset={-8}>
        <DropdownMenuItem
          variant="destructive"
          onClick={onRemoveManifest}>
          <IconCircleMinus /> Remove manifest
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

}