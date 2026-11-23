import { useState } from 'react';
import { Toolbar } from '@base-ui/react';
import type { Editor } from '@tiptap/react';
import { IconLink } from '@tabler/icons-react';
import { Toggle } from '@/shadcn/toggle';
import { LinkEditor } from './link-editor';

interface LinkButtonProps {

  editor: Editor;

  // Caret or selection is inside a link
  isLink: boolean;

  hasSelection: boolean;

}

export const LinkButton = (props: LinkButtonProps) => {
  const disabled = !props.hasSelection && !props.isLink;

  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <Toolbar.Button
        render={
          <Toggle
            disabled={disabled}
            pressed={!disabled && showDialog}
            className="rounded-sm size-7 min-w-7 disabled:opacity-25 aria-pressed:bg-accent aria-pressed:text-primary"
            aria-label="Link"
            aria-haspopup="dialog"
            aria-expanded={showDialog !== null}
            onPressedChange={() => setShowDialog(!showDialog)} />
        }>
        <IconLink className="size-4.5" strokeWidth={1.6} />
      </Toolbar.Button>

      <LinkEditor 
        editor={props.editor} 
        open={showDialog}
        onOpenChange={setShowDialog} />
    </>
  )

}