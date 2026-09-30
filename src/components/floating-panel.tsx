import { useRef, type ReactElement, type ReactNode, type RefObject } from 'react';
import { Popover } from '@base-ui/react/popover';
import { useDraggable } from '@neodrag/react';
import { cn } from '@/shadcn/utils';
import { IconGripVertical, IconX } from '@tabler/icons-react';

export const FloatingPanel = (props: Popover.Root.Props) => {
  const { onOpenChange, ...rest } = props;

  // Don't close on outside press and escape
  const handleOpenChange: Popover.Root.Props['onOpenChange'] = (open, eventDetails) => {
    if (
      eventDetails.reason === 'outside-press' ||
      eventDetails.reason === 'focus-out' ||
      eventDetails.reason === 'escape-key'
    ) {
      eventDetails.cancel();
      return;
    }
    onOpenChange?.(open, eventDetails);
  };

  return ( 
    <Popover.Root 
      {...rest} 
      modal={false} 
      onOpenChange={handleOpenChange} />
  )

}

export const FloatingPanelTrigger = Popover.Trigger;

interface FloatingPanelContentProps {
  
  align?: Popover.Positioner.Props['align'];

  children: ReactNode;

  className?: string;

  title: ReactElement;

  side?: Popover.Positioner.Props['side'];

  sideOffset?: Popover.Positioner.Props['sideOffset'];

}

export const FloatingPanelContent = (props: FloatingPanelContentProps) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 0, y: 0 });

  return (
    <Popover.Portal className="pointer-events-none">
      <Popover.Positioner
        side={props.side ?? 'bottom'}
        align={props.align ?? 'start'}
        sideOffset={props.sideOffset ?? 8}
        positionMethod="fixed"
        disableAnchorTracking
        className="z-60">
        <Popover.Popup
          ref={popupRef}
          className={cn(
            'rounded-md min-w-sm border-0 bg-popover text-popover-foreground ring-1 ring-black/5',
            'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.10)]',
            props.className,
          )}>
          <DragHandler popupRef={popupRef} headerRef={headerRef} positionRef={positionRef} />

          <div
            ref={headerRef}
            className="pointer-events-auto flex cursor-move items-center justify-between border-b rounded-t-md px-1 py-1 select-none">
            <div className="flex gap-1.5 items-center text-xs">
              <IconGripVertical 
                className="size-3.5 text-muted-foreground" />
              <Popover.Title>{props.title}</Popover.Title> 
            </div>

            <Popover.Close
              data-panel-close
              aria-label="Close"
              className="rounded-sm p-1 cursor-pointer text-muted-foreground opacity-70 
                transition-opacity hover:opacity-100 hover:bg-accent">
              <IconX className="size-4" />
            </Popover.Close>
          </div>

          <div className="pointer-events-auto">
            {props.children}
          </div>
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  )

}

// The popup mounts when the panel is open. Therefore,`useDraggable` setup 
// must live in a child of the popup rather than in the`FloatingPanelPopup` itself.
const DragHandler = (props: {
  popupRef: RefObject<HTMLElement | null>;
  headerRef: RefObject<HTMLElement | null>;
  positionRef: RefObject<{ x: number; y: number }>;
}) => {
  useDraggable(props.popupRef as RefObject<HTMLElement>, {
    handle: props.headerRef as RefObject<HTMLElement>,
    cancel: '[data-panel-close]',
    bounds: 'body',
    defaultPosition: props.positionRef.current,
    onDragEnd: ({ offsetX, offsetY }) => {
      props.positionRef.current = { x: offsetX, y: offsetY };
    }
  });

  return null;
}
