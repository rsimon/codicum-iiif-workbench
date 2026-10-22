import type { Editor } from '@tiptap/react';
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import Italic from '@tiptap/extension-italic';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Placeholder, UndoRedo } from '@tiptap/extensions';

export const SCHEMA_EXTENSIONS = [
  Document, 
  Paragraph, 
  Text, 
  HardBreak,
  Bold, 
  Italic
];

export const EDITOR_EXTENSIONS = [
  ...SCHEMA_EXTENSIONS,
  UndoRedo,
  Placeholder.configure({ placeholder: 'Type here' })
];

export const plainTextOf = (editor: Editor) =>
  editor.getText({ blockSeparator: '\n' });