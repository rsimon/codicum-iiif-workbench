import { IconGridDots } from '@tabler/icons-react';
import { ToolbarButton } from '@/components/toolbar-button';
import { Label } from '@/shadcn/label';
import { Switch } from '@/shadcn/switch';
import { useComposerStore } from '../composer-store';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@/shadcn/popover';

export const GridSettings = () => {
  const settings = useComposerStore(state => state.gridSettings);
  const change = useComposerStore(state => state.setGridSettings);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <ToolbarButton tooltip="Grid settings" aria-label="Grid settings">
            <IconGridDots className="size-5" strokeWidth={1.5} />
          </ToolbarButton>
        } />
      <PopoverContent align="end" className="w-56 gap-3">
        <PopoverHeader>
          <PopoverTitle>Grid settings</PopoverTitle>
        </PopoverHeader>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="composer-show-grid">Show grid</Label>
          <Switch
            id="composer-show-grid"
            size="sm"
            checked={settings.showGrid}
            onCheckedChange={showGrid => change({ ...settings, showGrid })} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="composer-show-grid-labels">Show grid labels</Label>
          <Switch
            id="composer-show-grid-labels"
            size="sm"
            checked={settings.showLabels}
            onCheckedChange={showLabels => change({ ...settings, showLabels })} />
        </div>
      </PopoverContent>
    </Popover>
  )
  
}