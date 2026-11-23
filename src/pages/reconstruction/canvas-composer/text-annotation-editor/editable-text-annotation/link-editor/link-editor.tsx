import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { IconLinkOff } from '@tabler/icons-react';
import type { Editor } from '@tiptap/react';
import { Button } from '@/shadcn/button';
import { Input } from '@/shadcn/input';
import { normalizeURL } from './link-editor-utils';
import { 
  Dialog, 
  DialogContent,
  DialogDescription, 
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shadcn/dialog';

interface LinkEditorProps {

  editor: Editor;

  open: boolean;

  onOpenChange(open: boolean): void;

}

export const LinkEditor = (props: LinkEditorProps) => {
  const [hasInteracted, setHasInteracted] = useState(false);

  const [url, setURL] = useState('');
  const normalizedURL = useMemo(() => normalizeURL(url), [url]);

  const isEmpty = url.trim() === '';
  const isValid = isEmpty || Boolean(normalizedURL);

  const showError = hasInteracted && !isValid && !isEmpty;

  useEffect(() => {
    if (!props.open || !props.editor) return;

    const previousUrl = props.editor.getAttributes('link').href;
    setURL(previousUrl || '');
    setHasInteracted(false);
  }, [props.open, props.editor]);

  const onSave = () => {
    if (!props.editor || !isValid) return;

    if (isEmpty) {
      // Remove link
      props.editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else if (normalizedURL) {
      props.editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: normalizedURL })
        .run();
    }

    props.onOpenChange(false);
  }

  const onKeydown = (evt: KeyboardEvent) => {
    if (evt.key === 'Enter') onSave();
  }

  const onRemove = () => {
    if (!props.editor) return;

    props.editor.chain().focus().extendMarkRange('link').unsetLink().run();
    props.onOpenChange(false);
  }

  const onChange = (evt: ChangeEvent<HTMLInputElement>) => {
    setURL(evt.target.value);
    setHasInteracted(true);
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md gap-2">
        <DialogHeader className="gap-2">
          <DialogTitle>Edit Link</DialogTitle>
          <DialogDescription>
            Enter the URL you want to link the selected text to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <Input
            autoFocus
            value={url}
            onChange={onChange}
            onKeyDown={onKeydown}
            className={isValid ? undefined : 'focus-visible:border-destructive focus-visible:ring-destructive/30'} />

          {showError && (
            <p className="text-xs text-destructive">
              Please enter a valid URL
            </p>
          )}
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            type="button"
            variant="link"
            onClick={onRemove}
            disabled={!props.editor?.isActive('link')}
            className="font-normal px-0">
            <IconLinkOff /> Remove Link
          </Button>

          <div className="flex space-x-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => props.onOpenChange(false)}>
              Cancel
            </Button>

            <Button 
              type="button" 
              onClick={onSave}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

}