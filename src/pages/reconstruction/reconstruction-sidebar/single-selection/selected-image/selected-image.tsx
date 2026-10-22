import { FieldLegend, FieldSet } from '@/shadcn/field';
import type { DraggableImage } from '../../../reconstruction-types';
import { EditableBoxSize } from '../editable-box-size';

interface SelectedImageProps {

  image: DraggableImage;

  onCommit(x: number, y: number, width: number): void;

}

export const SelectedImage = (props: SelectedImageProps) => {
  const { image } = props;

  const aspectRatio = image.resource.width / image.resource.height;

  return (
    <FieldSet className="gap-1 items-start space-y-1.5 px-4 pb-4">
      <FieldLegend variant="label" className="data-[variant=label]:text-xs uppercase font-normal text-muted-foreground">
        Selected image
      </FieldLegend>

      <EditableBoxSize
        lockAspectRatio
        value={{
          x: image.x,
          y: image.y,
          width: image.width,
          height: image.width / aspectRatio
        }}
        onCommit={box => props.onCommit(box.x, box.y, box.width)} />
    </FieldSet>
  )

}