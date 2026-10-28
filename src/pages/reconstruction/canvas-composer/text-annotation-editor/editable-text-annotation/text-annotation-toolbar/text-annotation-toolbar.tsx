import { useState, type HTMLAttributes } from 'react';
import { Toolbar } from '@base-ui/react/toolbar';
import type { Viewer } from 'openseadragon';
import { useEditorState, type Editor } from '@tiptap/react';
import { type Toggle as TogglePrimitive } from '@base-ui/react';
import { Button } from '@/shadcn/button';
import { Separator } from '@/shadcn/separator';
import { Toggle } from '@/shadcn/toggle';
import { useMousewheelForward } from '../../../use-mousewheel-forward';
import { FontSizeWidget } from './font-size-widget';
import { ToggleGroup, ToggleGroupItem } from '@/shadcn/toggle-group';
import { 
  IconAlignCenter,
  IconAlignLeft, 
  IconAlignRight, 
  IconBold, 
  IconGripVertical, 
  IconItalic, 
  IconTrash, 
  IconUnderline
} from '@tabler/icons-react';

interface TextAnnotationToolbarProps {

  editor: Editor | null;

  viewer: Viewer;

  dragHandleProps: HTMLAttributes<HTMLElement>;

  onDelete(): void;

}

export const TextAnnotationToolbar = (props: TextAnnotationToolbarProps) => {
  const editor = props.editor;

  const [el, setEl] = useState<HTMLDivElement | null>(null);

  useMousewheelForward(el, props.viewer);

  const state = useEditorState({
    editor,
    selector: ctx => ({
      isBold: Boolean(ctx.editor?.isActive('bold')),

      isItalic: Boolean(ctx.editor?.isActive('italic')),

      isUnderline: Boolean(ctx.editor?.isActive('underline')),
      
      fontSize: ctx.editor ? parseInt(
        ctx.editor.getAttributes('textStyle').fontSize || 
        getComputedStyle(ctx.editor.view.dom).fontSize
      ) : 16,

      textAlign: (['left', 'center', 'right'] as const).find(a =>
        ctx.editor?.isActive({ textAlign: a })
      ) ?? 'left'
    })
  });

  return (editor && state) ? (
    <Toolbar.Root 
      ref={setEl}
      className="bg-white flex items-stretch rounded-md pointer-events-auto ring-1
      ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.10)]"
      role="toolbar"
      aria-label="Text formatting"
      tabIndex={0}>
      <div
        tabIndex={-1}
        className="bg-muted text-muted-foreground cursor-grab rounded-l-md border-r flex items-center px-1"
        {...props.dragHandleProps}>
        <IconGripVertical className="size-4" />
      </div>

      <div className="p-1.5 flex gap-1 items-center">
        <FontSizeWidget 
          fontSize={state.fontSize}
          onChange={s => editor.chain().focus().setFontSize(`${s}px`).run()} />

        <Separator
          className="mx-1"
          orientation="vertical" />

        <Toolbar.Button render={
          <Toggle
            pressed={state.isBold}
            className="rounded-sm size-7 min-w-7 aria-pressed:bg-accent aria-pressed:text-primary"
            onPressedChange={() => editor.chain().focus().toggleBold().run()} /> 
          }>
          <IconBold className="size-3.5" />
        </Toolbar.Button>

        <Toolbar.Button render={
          <Toggle
            className="rounded-sm size-7 min-w-7 aria-pressed:bg-accent aria-pressed:text-primary"
            pressed={state.isItalic}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()} />
          }>
          <IconItalic className="size-3.5"  />
        </Toolbar.Button>

        <Toolbar.Button render={
          <Toggle
            className="rounded-sm size-7 min-w-7 aria-pressed:bg-accent aria-pressed:text-primary"
            pressed={state.isUnderline}
            onPressedChange={() => editor.chain().focus().toggleUnderline().run()} />
          }>
            <IconUnderline className="size-3.5"  />
          </Toolbar.Button>

        <Separator
          className="mx-1"
          orientation="vertical" />

        <Toolbar.Group>
          <ToggleGroup
            className="gap-1"
            value={[state.textAlign]}
            onValueChange={([val]) => {
              if (val) editor.chain().focus().setTextAlign(val).run();
            }}>
            <ToolbarToggleGroupItem value="left">
              <IconAlignLeft className="size-3.5" /> 
            </ToolbarToggleGroupItem>

            <ToolbarToggleGroupItem value="center">
              <IconAlignCenter className="size-3.5" /> 
            </ToolbarToggleGroupItem>

            <ToolbarToggleGroupItem value="right">
              <IconAlignRight className="size-3.5" /> 
            </ToolbarToggleGroupItem>
          </ToggleGroup>
        </Toolbar.Group>

        <Separator
          className="mx-1"
          orientation="vertical" />

        <Toolbar.Button render={
          <Button
            variant="ghost"
            className="rounded-md size-7 text-destructive hover:text-destructive"
            onClick={props.onDelete} />
          }>
          <IconTrash className="size-3.5" />
        </Toolbar.Button>
      </div>
    </Toolbar.Root>
  ) : null;

}

const ToolbarToggleGroupItem = (props: TogglePrimitive.Props) => {

  return (
    <ToggleGroupItem
      className="rounded-sm size-7 min-w-7 aria-pressed:bg-accent aria-pressed:text-primary"
      {...props} />
  )

}