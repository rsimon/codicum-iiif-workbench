import { useEffect, useRef } from 'react';
import type { JSONContent } from '@tiptap/core';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { EDITOR_EXTENSIONS, plainTextOf } from './content-utils';
import './text-annotation-content.css';

interface ContentEditorProps {

  // Initial content only
  doc: JSONContent;

  // Passes editors instance up for the toolbar
  onEditor(editor: Editor | null): void;

  onContentChange(doc: JSONContent, plainText: string): void;

  onBlur(): void;

}


export const ContentEditor = (props: ContentEditorProps) => {

  const callbacks = useRef(props);
  callbacks.current = props;

  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: props.doc,
    autofocus: 'end',
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: 'text-annotation-content min-h-full cursor-text'
      }
    },
    onUpdate: ({ editor }) =>
      callbacks.current.onContentChange(editor.getJSON(), plainTextOf(editor)),
    onBlur: () => callbacks.current.onBlur()
  });

  useEffect(() => {
    callbacks.current.onEditor(editor);
    return () => callbacks.current.onEditor(null);
  }, [editor]);

  return <EditorContent editor={editor} className="h-full" />;

}