import type { Viewer } from 'openseadragon';
// import { TextAnnotationOverlay } from '@/components/text-annotation-overlay';

interface TextAnnotationLayerProps {

  viewer: Viewer;

}

export const TextAnnotationLayer = (props: TextAnnotationLayerProps) => {

  // TODO
  
  return (
    <div className="absolute inset-0 z-60 pointer-events-none">
      {/*
        {props.bounds.flatMap(({ canvas, x, y, width }) => {
          const scale = width / canvas.width;
          return (canvas.annotations ?? []).filter(annotation => annotation.text.trim().length > 0).map(annotation => (
            <TextAnnotationOverlay
              key={`${canvas.id}:${annotation.id}`}
              viewer={props.viewer}
              annotation={annotation}
              canvasPlacement={{
                x,
                y,
                scale,
                width: canvas.width,
                height: canvas.height
              }} />
          ));
        })}
      */}
    </div>
  )

}