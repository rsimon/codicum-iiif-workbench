import type { CozyImageResource } from 'cozy-iiif';
import { cn } from '@/shadcn/utils';
import type { ReconstructionCanvas } from '@/types';
import { getImageCrop } from '../preview-utils';

const THUMBNAIL_SIZING = 'w-full h-auto @[160px]:w-auto @[160px]:max-w-[50%] @[160px]:min-w-0 @[160px]:flex-1';

interface ThumbnailProps {

  canvas: ReconstructionCanvas;

  className?: string;

}

export const Thumbnail = (props: ThumbnailProps) => {
  const { canvas } = props;

  const sources = canvas.type === 'original' ? [canvas.source] : canvas.sources;
  const images = sources.flatMap(s => s.canvas.images);

  const { width: canvasWidth, height: canvasHeight } = canvas.type === 'original' ? canvas.source.canvas : canvas;

  const isPrimitive = images.length === 1 && !images[0].target;

  return isPrimitive ? (
    <PrimitiveImageThumbnail
      image={images[0]}
      label={canvas.label}
      canvasWidth={canvasWidth}
      canvasHeight={canvasHeight}
      className={props.className} />
  ) : (
    <CompositeImageThumbnail 
      canvasHeight={canvasHeight}
      canvasWidth={canvasWidth} 
      images={images} 
      label={canvas.label} 
      className={props.className} />
  )

}

interface PrimitiveImageThumbnailProps {

  canvasHeight: number;

  canvasWidth: number;

  className?: string;

  image: CozyImageResource;

  label: string;

}

const PrimitiveImageThumbnail = (props: PrimitiveImageThumbnailProps) => {
  const crop = getImageCrop(props.image);

  // Note that thumbnail max size (Tailwind) is (88 x 112 px) x devicePixelRatio
  const isCropped = crop.x !== 0 || crop.y !== 0 || crop.w !== props.image.width || crop.h !== props.image.height;
  return isCropped ? (
    <div
      className={cn(THUMBNAIL_SIZING, 'relative overflow-hidden rounded ring ring-foreground/10 shadow-xs', props.className)}
      style={{ aspectRatio: `${props.canvasWidth} / ${props.canvasHeight}` }}>
      <img
        src={props.image.getImageURL({ size: 350 })}
        className="absolute max-w-none"
        style={{
          left: `${-(crop.x / crop.w) * 100}%`,
          top: `${-(crop.y / crop.h) * 100}%`,
          width: `${(props.image.width / crop.w) * 100}%`,
          height: `${(props.image.height / crop.h) * 100}%`
        }}
        alt={props.label} />
    </div>
  ) : (
    <img
      src={props.image.getImageURL({ size: 350 })}
      className={cn(THUMBNAIL_SIZING, 'rounded ring ring-foreground/10 shadow-xs object-cover', props.className)}
      style={{ aspectRatio: `${props.canvasWidth} / ${props.canvasHeight}` }}
      alt={props.label} />
  )

}

interface CompositeImageThumbnailProps {

  canvasHeight: number;

  canvasWidth: number;

  className?: string;

  images: CozyImageResource[];

  label: string;

}

const CompositeImageThumbnail = (props: CompositeImageThumbnailProps) => {
  const { canvasWidth, canvasHeight, label } = props;

  const renderImage = (image: CozyImageResource, idx: number) => {
    const target = image.target || {
      x: 0,
      y: 0,
      w: canvasWidth,
      h: canvasHeight
    };
    
    const crop = getImageCrop(image);
    const isCropped = crop.x !== 0 || crop.y !== 0 || crop.w !== image.width || crop.h !== image.height;

    return (
      <div
        key={idx}
        className="absolute overflow-hidden"
        style={{
          left: `${(target.x / canvasWidth) * 100}%`,
          top: `${(target.y / canvasHeight) * 100}%`,
          width: `${(target.w / canvasWidth) * 100}%`,
          height: `${(target.h / canvasHeight) * 100}%`,
        }}>
        <img
          src={image.getImageURL({ size: 350 })}
          alt={`${label}: image ${idx + 1}`}
          className="absolute max-w-none"
          style={isCropped ? {
            left: `${-(crop.x / crop.w) * 100}%`,
            top: `${-(crop.y / crop.h) * 100}%`,
            width: `${(image.width / crop.w) * 100}%`,
            height: `${(image.height / crop.h) * 100}%`
          } : {
            left: 0,
            top: 0,
            width: '100%',
            height: '100%'
          }} />
      </div>
    )
  }

  return (
    <div
      className={cn(
        THUMBNAIL_SIZING,
        'relative overflow-hidden bg-white rounded ring ring-foreground/10 shadow-xs',
        props.className
      )}
      style={{ aspectRatio: `${props.canvasWidth} / ${props.canvasHeight}` }}>
      {props.images.map((image, idx) => renderImage(image, idx))}
    </div>
  )

}