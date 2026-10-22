import type { HTMLAttributes } from 'react';
import type { Editor } from '@tiptap/react';

interface TextAnnotationToolbarProps {

  editor: Editor | null;

  dragHandleProps: HTMLAttributes<HTMLElement>;

}

export const TextAnnotationToolbar = (props: TextAnnotationToolbarProps) => {

  return (
    <div className="h-12 w-40 bg-red-500">
      <div 
        className="bg-green-400"
        {...props.dragHandleProps}>
        DRAG!
      </div>
    </div>
  )

}