import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { IconAlertTriangle, IconGripVertical, IconStack2 } from '@tabler/icons-react';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/utils/set-custom-native-drag-preview';
import { DropIndicator as LineIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { attachInstruction, extractInstruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import type { Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { LazyThumbnail } from '@/components/lazy-thumbnail';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shadcn/tooltip';
import { cn, withStopPropagation } from '@/shadcn/utils';
import { useAppStore } from '@/store/app-store';
import type { ReconstructionCanvas, SourceCanvas } from '@/types';
import { withHistory } from '../reconstruction-history';
import { EditableCanvasLabel } from './editable-canvas-label';
import { ITEM_GAP, TreeDropIndicator, viewTransitionName } from './use-drag-and-drop';
import type { DragPayload } from './use-drag-and-drop';
import { ReconstructionTreeItemActions } from './tree-item-actions';

interface ReconstructionTreeItemProps {

  item: ReconstructionCanvas;

  selectedItems: ReconstructionCanvas[];

  index: number;

  isSelected: boolean;

  onSelect(event: React.MouseEvent): void;

  pinnedEdge?: 'top' | 'bottom';

}

export const ReconstructionTreeItem = (props: ReconstructionTreeItemProps) => {
  const { item, selectedItems, index, isSelected, onSelect, pinnedEdge } = props;

  const renameCanvas = useAppStore(state => state.renameCanvas);

  const ref = useRef<HTMLLIElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [instruction, setInstruction] = useState<Instruction | null>(null);

  const [isEditingLabel, setIsEditingLabel] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    return combine(
      draggable({
        element,
        dragHandle: handleRef.current ?? undefined,
        getInitialData: (): DragPayload => {
          const draggedItems = isSelected ? selectedItems : [item];

          return {
            kind: 'root',
            canvasIds: draggedItems.map(selected => selected.id),
            allOriginal: draggedItems.every(selected => selected.type === 'original')
          };
        },
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          if (!isSelected || selectedItems.length < 2) {
            const row = element.cloneNode(true) as HTMLLIElement;
            row.style.width = `${element.getBoundingClientRect().width}px`;
            row.style.backgroundColor = 'white';

            setCustomNativeDragPreview({
              nativeSetDragImage,
              render: ({ container }) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'inline-block p-2';
                wrapper.append(row);
                container.append(wrapper);
              }
            });
            return;
          }

          setCustomNativeDragPreview({
            nativeSetDragImage,
            render: ({ container }) => {
              const root = createRoot(container);
              root.render(<MultiSelectDragPreview items={selectedItems} />);
              return () => root.unmount();
            }
          });
        },
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false)
      }),
      dropTargetForElements({
        element,
        getData: ({ input, element, source }) => {
          const payload = source.data as unknown as DragPayload;

          // Composites may never become children: block the middle zone
          // when a composite is being dragged.
          const canMerge = payload.kind !== 'root' || payload.allOriginal;
          const block: Instruction['type'][] =
            !canMerge
              ? ['make-child']
              : [];

          return attachInstruction({ id: item.id, index }, {
            input,
            element,
            currentLevel: 0,
            indentPerLevel: 0,
            mode: 'standard',
            block
          });
        },
        onDrag: ({ self }) => setInstruction(extractInstruction(self.data)),
        onDragLeave: () => setInstruction(null),
        onDrop: () => setInstruction(null)
      })
    );
  }, [item, index, isSelected, selectedItems]);

  return (
    <li
      ref={ref}
      data-canvas-id={item.id}
      className={cn(
        'relative border rounded-md shadow-xs bg-white',
        isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : undefined,
        isDragging ? 'opacity-40' : undefined
      )}
      style={{ viewTransitionName: viewTransitionName(item.id) }}>
      <div
        className="group"
        onClick={onSelect}>
        <div className="flex items-stretch cursor-default">
          <div
            ref={handleRef}
            aria-hidden="true"
            onMouseDown={withStopPropagation()}
            className="flex flex-col gap-0.5 cursor-grab select-none pl-1.5 pr-1 items-center
            justify-start pt-2.5 text-muted-foreground">
            <IconGripVertical
              className="size-3.5" />
            <span className="text-xs">{index + 1}</span>
          </div>

          {item.type === 'original' ? (
            <div className="grow flex justify-between pr-1.5 items-start overflow-hidden">
              <TreeItemContent 
                editable
                source={item.source}
                label={item.label} 
                isEditing={isEditingLabel} 
                onIsEditingChange={setIsEditingLabel} 
                onCommmitEdit={label => withHistory(() => renameCanvas(item.id, label))} />
              
              <ReconstructionTreeItemActions 
                className="mt-1.5" 
                item={props.item} 
                onRenameCanvas={() => setIsEditingLabel(true)}/>
            </div>
          ) : (
            <div className="px-1.5 pt-2.5 pb-1 pr-2 grow overflow-hidden">
              <div className="flex gap-2 justify-between items-start min-w-16">
                <div className="flex gap-2 items-center pb-1 min-w-16">
                  <IconStack2 className="size-4.5 text-muted-foreground/80" stroke={1.5} /> 

                  <EditableCanvasLabel
                    value={item.label}
                    isEditing={isEditingLabel}
                    onIsEditingChange={setIsEditingLabel}
                    onCommit={label => withHistory(() => renameCanvas(item.id, label))} />

                  <span className="shrink min-w-12 whitespace-nowrap text-xs text-muted-foreground ml-0.5 flex gap-1.5 items-cente pr-0.5">
                    <span className="min-w-12 truncate">{item.sources.length} canvases</span>
                    {item.sources.length === 0 && (
                      <EmptyCanvasHint />
                    )}
                  </span>
                </div>

                <ReconstructionTreeItemActions 
                  item={props.item} 
                  onRenameCanvas={() => setIsEditingLabel(true)}/>
              </div>

              <div>
                {item.sources.length > 0 ? (
                  <ul
                    className="py-1.5 px-0 flex flex-col gap-2">
                    {item.sources.map(source => (
                      <CompositeChildItem
                        key={source.instanceId}
                        compositeId={item.id}
                        source={source} />
                    ))}
                  </ul>
                ) : (
                  <div className="whitespace-nowrap truncate min-w-16 border border-foreground/25 border-dashed rounded-sm my-1.5 py-2.5 px-4
                    text-xs text-muted-foreground text-center font-light">
                    Empty composite — drop canvases here
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {instruction ? (
        <TreeDropIndicator instruction={instruction} />
      ) : pinnedEdge ? (
        <LineIndicator edge={pinnedEdge} gap={ITEM_GAP} />
      ) : null}
    </li>
  )

}

const MultiSelectDragPreview = ({ items }: { items: ReconstructionCanvas[] }) => (
  <div className="grid w-fit p-6">
    {items.slice(0, 6).map((item, index) => (
      <div
        key={item.id}
        className="col-start-1 row-start-1 w-60 truncate whitespace-nowrap rounded-md border-2 border-primary bg-white px-3 py-2.5 text-sm text-foreground shadow-xs"
        style={{ transform: `translate(${index * 4}px, ${index * 4}px)` }}>
        {item.label}
      </div>
    ))}
  </div>
)

interface CompositeChildItemProps {

  compositeId: string;

  source: SourceCanvas;

}

const CompositeChildItem = (props: CompositeChildItemProps) => {
  const { compositeId, source } = props;

  const ref = useRef<HTMLLIElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    return draggable({
      element,
      dragHandle: handleRef.current ?? undefined,
      getInitialData: (): DragPayload =>
        ({ kind: 'child', compositeId, canvasId: source.canvas.id, instanceId: source.instanceId }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false)
    });
  }, [compositeId, source.canvas.id]);

  return (
    <li
      ref={ref}
      className={cn(
        'flex items-stretch -ml-1 rounded-sm border bg-muted',
        isDragging ? 'opacity-40' : undefined
      )}
      style={{ viewTransitionName: viewTransitionName(source.instanceId) }}>
      <div
        ref={handleRef}
        aria-hidden="true"
        onMouseDown={withStopPropagation()}
        className="flex cursor-grab select-none pl-1.5 items-start pt-2.5">
        <IconGripVertical
          className="size-3.5 text-muted-foreground" />
      </div>

      <TreeItemContent 
        source={source}
        label={source.canvas.getLabel()} />
    </li>
  )

}

interface TreeItemContentProps {

  label: string; 

  source: SourceCanvas;

  editable?: boolean;

  isEditing?: boolean;

  onIsEditingChange?(editing: boolean): void;

  onCommmitEdit?(label: string): void;

}

const TreeItemContent = (props: TreeItemContentProps) => {
  const { label, source } = props;

  const sources = useAppStore(state => state.sources);

  return (
    <div className="w-full flex gap-2 min-w-0 px-2 py-2 overflow-hidden">
      <LazyThumbnail
        src={source.canvas.getThumbnailURL(80)}
        alt={`${label} preview image`}
        className="w-9 h-11 shrink-0 rounded-xs shadow-xs object-cover ring-1 ring-foreground/20" />

      <div className="flex flex-col gap-0.5 justify-start items-stretch min-w-0 overflow-hidden">
        {props.editable ? (
          <EditableCanvasLabel
            value={label}
            isEditing={props.isEditing}
            onIsEditingChange={props.onIsEditingChange}
            onCommit={props.onCommmitEdit} />
        ) : (
          <div className="truncate text-sm min-w-0">
            {label} 
          </div>
        )}

        <span className="text-muted-foreground text-xs">
          {sources.find(s => s.manifest.id === source.sourceManifestId)?.manifest.getLabel()}
        </span>
      </div>
    </div>
  )

}

const EmptyCanvasHint = () => (
  <Tooltip>
    <TooltipTrigger>
      <IconAlertTriangle className="size-4 mr-1" />
    </TooltipTrigger>

    <TooltipContent>
      <div className="leading-relaxed text-[13px] tracking-wide">
        If this canvas is intentionally empty, add a descriptive label 
        such as "fol. 12v (missing)", as recommended by the <a 
          target="_blank" 
          href="https://iiif.io/api/cookbook/recipe/0283-missing-image/"
          className="underline">IIIF cookbook</a>.
      </div>
    </TooltipContent>
  </Tooltip>
)