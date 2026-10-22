import { IconTrash } from '@tabler/icons-react';
import { Button } from '@/shadcn/button';
import { FieldLegend, FieldSet } from '@/shadcn/field';
import type { ReconstructionCanvas, TextAnnotation } from '@/types';
import type { TextAnnotationSelection } from '../../../reconstruction-types';
import { EditableBoxSize, type Box } from '../editable-box-size';

interface SelectedTextAnnotationProps {

  canvas: ReconstructionCanvas;

  selected: TextAnnotationSelection;

  onDelete(): void;

  onUpdate(updated: TextAnnotation): void;

}

export const SelectedTextAnnotation = (props: SelectedTextAnnotationProps) => {
  const annotation = (props.canvas.annotations ?? []).find(a => a.id === props.selected.annotationId);

  const onCommit = (box: Box) => {
    if (!annotation) return;
    props.onUpdate({ ...annotation, ...box });
  }

  return annotation ? (
    <FieldSet className="gap-1 items-start space-y-1.5 px-4 pb-4">
      <FieldLegend variant="label" className="w-full flex items-center justify-between data-[variant=label]:text-xs uppercase font-normal text-muted-foreground">
        Annotation
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-destructive"
          aria-label={`Delete text annotation ${annotation.text.trim() || 'Untitled text'}`}
          title="Delete annotation"
          onClick={props.onDelete}>
          <IconTrash className="size-3.5 mb-0.5" />
        </Button>
      </FieldLegend>

      <EditableBoxSize
        value={{
          x: annotation.x,
          y: annotation.y,
          width: annotation.width,
          height: annotation.height
        }}
        lockAspectRatio
        onCommit={onCommit} />
    </FieldSet>
  ) : null;

}