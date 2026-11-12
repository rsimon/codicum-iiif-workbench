import { IconChevronUp, IconGrid4x4 } from '@tabler/icons-react';
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
          <ToolbarButton 
            tooltip="Grid settings" 
            aria-label="Grid settings"
            className="gap-px p-2">
            <IconGrid4x4 className="size-4.5" strokeWidth={1.5} />
            <IconChevronUp className="size-3 text-foreground/80" strokeWidth={1.5} />
          </ToolbarButton>
        } />

      <PopoverContent 
        align="end"
        className="w-32 p-3 gap-3.5"
        sideOffset={14}>
        <PopoverHeader className="sr-only">
          <PopoverTitle>Grid settings</PopoverTitle>
        </PopoverHeader>

        <div className="flex items-center justify-between gap-2">
          <Label 
            htmlFor="composer-show-grid"
            className="font-normal tracking-wide grow">
            Grid
          </Label>

          <Switch
            id="composer-show-grid"
            size="sm"
            className="data-checked:bg-foreground"
            checked={settings.showGrid}
            onCheckedChange={showGrid => change({ ...settings, showGrid })} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Label 
            htmlFor="composer-show-grid-labels"
            className="font-normal tracking-wide grow">
            Labels
          </Label>

          <Switch
            id="composer-show-grid-labels"
            size="sm"
            className="data-checked:bg-foreground"
            checked={settings.showLabels}
            onCheckedChange={showLabels => change({ ...settings, showLabels })} />
        </div>
      </PopoverContent>
    </Popover>
  )
  
}