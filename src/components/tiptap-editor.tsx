import { useEffect, useRef } from 'react';
import { EditorContent, useEditor, type Editor, type JSONContent } from '@tiptap/react';
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import Italic from '@tiptap/extension-italic';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { TextStyle, FontSize } from '@tiptap/extension-text-style';
import { Placeholder, UndoRedo } from '@tiptap/extensions';

export const SCHEMA_EXTENSIONS = [
  Document, 
  Paragraph, 
  Text, 
  HardBreak,
  Bold, 
  Italic,
  TextStyle,
  FontSize
];

export const EDITOR_EXTENSIONS = [
  ...SCHEMA_EXTENSIONS,
  UndoRedo,
  Placeholder.configure({ placeholder: 'Type here' })
];

interface TiptapEditorProps {

  // Initial content
  doc: JSONContent;

  // Hands the instance upwards for the toolbar (null on unmount)
  onEditor(editor: Editor | null): void;

  onContentChange(doc: JSONContent): void;

  onBlur(): void;

}

export const TiptapEditor = (props: TiptapEditorProps) => {
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
      callbacks.current.onContentChange(editor.getJSON()),
    onBlur: () => callbacks.current.onBlur()
  });

  useEffect(() => {
    callbacks.current.onEditor(editor);
    return () => callbacks.current.onEditor(null);
  }, [editor]);

  return <EditorContent editor={editor} className="h-full" />;

}