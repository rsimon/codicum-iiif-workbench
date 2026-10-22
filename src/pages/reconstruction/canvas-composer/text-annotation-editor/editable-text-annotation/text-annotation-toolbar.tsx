import { useState, type HTMLAttributes } from 'react';
import type { Viewer } from 'openseadragon';
import type { Editor } from '@tiptap/react';
import { IconBold, IconGripVertical, IconItalic, IconTrash } from '@tabler/icons-react';
import { ToolbarButton } from '@/components/toolbar-button';
import { Separator } from '@/shadcn/separator';
import { useMousewheelForward } from '../../use-mousewheel-forward';

interface TextAnnotationToolbarProps {

  editor: Editor | null;

  viewer: Viewer;

  dragHandleProps: HTMLAttributes<HTMLElement>;

}

export const TextAnnotationToolbar = (props: TextAnnotationToolbarProps) => {

  const [el, setEl] = useState<HTMLDivElement | null>(null);

  useMousewheelForward(el, props.viewer);

  return (
    <div 
      ref={setEl}
      className="bg-white flex items-stretch rounded-md pointer-events-auto ring-1
      ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.10)]">
      <div
        className="bg-muted text-muted-foreground cursor-grab rounded-l-md border-r flex items-center px-1"
        {...props.dragHandleProps}>
        <IconGripVertical className="size-4" />
      </div>

      <div className="p-1 flex items-center">
        <ToolbarButton
          className="rounded-md size-7"
          tooltip="Bold">
          <IconBold className="size-3.5" />
        </ToolbarButton>

        <ToolbarButton
          className="rounded-md size-7"
          tooltip="Italic">
          <IconItalic className="size-3.5"  />
        </ToolbarButton>

        <Separator
          className="mx-1"
          orientation="vertical" />

        <ToolbarButton
          className="rounded-md size-7 text-destructive hover:text-destructive"
          tooltip="Italic">
          <IconTrash className="size-3.5" />
        </ToolbarButton>
      </div>
    </div>
  )

}