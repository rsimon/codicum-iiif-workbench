import { useMemo } from 'react';
import type { JSONContent } from '@tiptap/core';
import { generateHTML } from '@tiptap/html';
import { SCHEMA_EXTENSIONS } from './content-utils';
import './text-annotation-content.css';

interface ContentReadOnlyProps {

  doc: JSONContent;

}

/**
 * Idle rendering: plain HTML generated from the stored document. No editor
 * instance, so any number of these can be on screen.
 */
export const ContentReadOnly = (props: ContentReadOnlyProps) => {

  const html = useMemo(() => generateHTML(props.doc, SCHEMA_EXTENSIONS), [props.doc]);

  return (
    <div
      className="text-annotation-content min-h-full"
      dangerouslySetInnerHTML={{ __html: html }} />
  )

}