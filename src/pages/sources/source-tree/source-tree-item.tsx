import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { CozyCanvas } from 'cozy-iiif';
import { Button } from '@/shadcn/button';
import { Checkbox } from '@/shadcn/checkbox';
import { Label } from '@/shadcn/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shadcn/tooltip';
import { cn, withStopPropagation } from '@/shadcn/utils';
import { LazyThumbnail } from '@/components/lazy-thumbnail';
import { useAppStore } from '@/store/app-store';
import type { SourceManifest } from '@/types';
import { SourceTreeItemActions } from './source-tree-item-actions';

interface ManifestTreeItemProps {

  source: SourceManifest;

  inReconstruction: number;

  isCollapsed: boolean;

  isSelected: boolean;

  onToggleExpanded(): void;

}

export const ManifestTreeItem = (props: ManifestTreeItemProps) => {
  const { manifest } = props.source;

  const allChecked = props.inReconstruction === manifest.canvases.length;
  const someChecked = props.inReconstruction > 0 && !allChecked;

  const addCanvases = useAppStore(state => state.addSourceCanvasesToReconstruction);
  const removeCanvases = useAppStore(state => state.removeSourceCanvasesFromReconstruction);

  const onClickCheckbox = () => {
    if (allChecked) {
      removeCanvases(manifest.canvases.map(c => c.id));
    } else {
      addCanvases(manifest.canvases.map(canvas => ({ 
        sourceId: manifest.id,
        canvas
      })));
    }
  }

  return (
    <div className="py-1 text-sm bg-white/80 backdrop-blur">
      <div className="group flex pr-1.5 gap-1 rounded-md justify-between items-center">
        <div
          className="flex gap-0.5 min-w-0 flex-1 items-center">
          <Button
            id={`toggle-${manifest.id}`}
            variant="ghost"
            onClick={withStopPropagation(() => props.onToggleExpanded())}
            className="text-muted-foreground size-7 flex items-center justify-center hover:bg-secondary">
            {props.isCollapsed ? (
              <IconChevronRight />
            ) : (
              <IconChevronDown />
            )}
          </Button>

          <Checkbox
            className="mr-1.25 mb-px border-foreground/25" 
            indeterminate={someChecked}
            checked={allChecked}
            onCheckedChange={onClickCheckbox} />

          <Label
            htmlFor={`toggle-${manifest.id}`}
            className="block flex-1 min-w-0 text-foreground font-normal truncate">
            {manifest.getLabel()}
          </Label>
        </div>
  
        <div className={cn(
          'tracking-wide text-xs group-hover:hidden group-has-data-popup-open:hidden ',
          props.inReconstruction === 0 ? 'text-muted-foreground/80' : 'text-primary'
        )}>
          {props.inReconstruction.toLocaleString()}/{manifest.canvases.length.toLocaleString()}
        </div>

        <SourceTreeItemActions 
          manifestId={manifest.id} />
      </div>
    </div>
  )

}

interface CanvasTreeItemProps {

  canvas: CozyCanvas;

  isSelected: boolean;

  isInReconstruction: boolean;
  
  onSelect(): void;

  onSetInReconstruction(inReconstruction: boolean): void;

}

export const CanvasTreeItem = (props: CanvasTreeItemProps) => {
  const physicalSize = useAppStore(state => state.sizes.get(props.canvas.id));

  // Thumbnail size (Tailwind) is 36 x 44
  return (
    <div
      className={cn(
        'ml-5 p-1 pr-3 pl-2 rounded-md group flex cursor-default items-center justify-between gap-2 text-sm transition-colors',
        props.isSelected ? 'bg-neutral-200/60 text-accent-foreground' : 'hover:bg-neutral-200/60'
      )}
      onClick={props.onSelect}>

      <div className="flex items-center gap-3 min-w-0 flex-1 relative">
        <div onClick={e => e.stopPropagation()}>
          <Tooltip>
            <TooltipTrigger 
              tabIndex={-1}>
              <Checkbox
                id={`check-${props.canvas.id}`}
                className="cursor-pointer border-foreground/25 bg-white" 
                checked={props.isInReconstruction} 
                onCheckedChange={props.onSetInReconstruction} />
            </TooltipTrigger>

            <TooltipContent
              side="right"
              sideOffset={10}>
              Add {props.canvas.getLabel()} to the reconstruction
            </TooltipContent>
          </Tooltip>
        </div>

        <LazyThumbnail
          canvas={props.canvas}
          alt={`${props.canvas.getLabel()} preview image`}
          className="w-9 h-11 shrink-0 rounded-xs shadow-xs object-cover ring-1 ring-foreground/10" />

        <div className="space-y-px overflow-hidden">
          <div className="flex-1 min-w-0 truncate text-xs">{props.canvas.getLabel()}</div>
          {physicalSize && (
            <div className="text-[11px] tracking-wide text-muted-foreground">
              {physicalSize.width} x {physicalSize.height} {physicalSize.unit}
            </div>
          )}
        </div>
      </div>
    </div>
  )

}