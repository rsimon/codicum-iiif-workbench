import { useMemo } from 'react';
import { generateHTML, type JSONContent } from '@tiptap/react';
import { SCHEMA_EXTENSIONS } from './tiptap-editor';

interface TiptapReadOnlyViewProps {

  doc: JSONContent;

}

/**
 * Idle rendering: plain HTML generated from the stored document. No editor
 * instance, so any number of these can be on screen.
 */
export const TiptapReadOnlyView = (props: TiptapReadOnlyViewProps) => {

  const html = useMemo(() => generateHTML(props.doc, SCHEMA_EXTENSIONS), [props.doc]);

  return (
    <div
      className="text-annotation-content min-h-full"
      dangerouslySetInnerHTML={{ __html: html }} />
  )

}