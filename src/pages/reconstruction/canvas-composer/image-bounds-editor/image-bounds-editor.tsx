import { useEffect, useMemo, useRef, useState } from 'react';
import { Point, Viewer } from 'openseadragon';
import { useAppStore } from '@/store/app-store';
import { useReconstructionStore } from '../../reconstruction-store';
import type { ComposerLayoutItem, DraggableImage } from '../../reconstruction-types';
import { getImageKey } from '../../reconstruction-utils';
import { useComposerStore } from '../composer-store';
import { getIntersectingItems } from '../composer-utils';
import { CornerHandle } from './corner-handle';
import { EdgeHandle } from './edge-handle';
import { 
  cornersToSvgPoints, 
  getImageCorners, 
  getPoint, 
  HANDLE_TYPES, 
  RESIZE_SIGNS, 
  type InitialShape, 
  type ResizeHandleType
} from './image-bounds-editor-utils';

interface ImageBoundsEditorProps {

  viewer: Viewer;

}

export type HandleType = 
  | 'SHAPE'
  | ResizeHandleType;


export const ImageBoundsEditor = (props: ImageBoundsEditorProps) => {
  const reconstruction = useAppStore(state => state.reconstruction);

  const layout = useComposerStore(state => state.layout);
  const selectedImage = useComposerStore(state => state.selectedImage);

  const updateImage = useComposerStore(state => state.updateImage);
  const moveImageToCanvas = useComposerStore(state => state.moveImageToCanvas);
  const setIsUserEdit = useComposerStore(state => state.setIsUserEdit);
  const editMode = useComposerStore(state => state.editMode);
  const setEditMode = useComposerStore(state => state.setEditMode);

  const setSelectedCanvas = useReconstructionStore(state => state.setSelection);

  // Last pointer down location (OSD viewport coordinate system)
  const origin = useRef<Point | undefined>(undefined);

  // Image state when drag started
  const initialShape = useRef<InitialShape | undefined>(undefined);

  const [intersectingItems, setIntersectingItems] = useState<ComposerLayoutItem[]>([]);

  // Stable identity for the current selection - unlike `selectedImage` itself,
  // this does NOT change on every drag-driven position update, so it's safe
  // to use as an effect dependency for resetting drag state on (re)selection.
  const selectionKey = selectedImage ? getImageKey(selectedImage.image) : undefined;

  const [isValidDestination, setIsValidDestination] = useState(true);

  useEffect(() => {
    origin.current = undefined;
    initialShape.current = undefined;
    setIsValidDestination(true);
  }, [selectionKey]);

  useEffect(() => {
    if (!selectedImage) return;

    const canvas = reconstruction
      .find(r => r.id === selectedImage.item.reconstructionCanvasId);
    if (!canvas) return;

    const { x, y, width } = selectedImage.image;
    const liveCorners = getImageCorners(selectedImage, canvas.width, x, y, width);
    updateIntersectingItems(liveCorners);
  }, [selectionKey, reconstruction]);

  useEffect(() => {
    if (!selectedImage || !initialShape.current) return;
    if (initialShape.current.item.reconstructionCanvasId === selectedImage.item.reconstructionCanvasId) return;

    // Selected (= dragged) image and initialShape no longer point to the
    // same reconstruction canvas ID - this means the canvas was modified,
    // usually changed from 'original' to 'composite' -> follow!
    const canvas = reconstruction
      .find(r => r.id === selectedImage.item.reconstructionCanvasId);

    if (!canvas) return;

    initialShape.current = {
      ...initialShape.current,
      item: selectedImage.item,
      canvas
    };
  }, [selectedImage, reconstruction]);

  const corners = useMemo(() => {
    if (!selectedImage) return [];

    const canvas = reconstruction
      .find(r => r.id === selectedImage.item.reconstructionCanvasId);
    if (!canvas) return [];

    return getImageCorners(selectedImage, canvas.width);
  }, [selectedImage, reconstruction]);

  const updateIntersectingItems = (corners: Point[]) => {
    const intersectingItems = getIntersectingItems({
      x1: corners[0].x,
      y1: corners[0].y,
      x2: corners[2].x,
      y2: corners[2].y
    }, layout);

    setIntersectingItems(intersectingItems);

    // For convenience
    return intersectingItems;
  }

  const checkDestination = (shape: InitialShape, intersecting: ComposerLayoutItem[]) => {
    if (!selectedImage) return { hasChangedDestination: false };

    const { item } = shape;

    const destination = intersecting.find(i => 
      i.reconstructionCanvasId === item.reconstructionCanvasId) 
      || intersecting[0];

    const hasChangedDestination = destination && 
      destination.reconstructionCanvasId !== item.reconstructionCanvasId;

    const isValidDestination = destination && 
      (!hasChangedDestination || selectedImage.canChangeItem);

    return { hasChangedDestination, destination, isValidDestination };
  }

  const onPointerDown = (evt: React.PointerEvent) => {
    evt.stopPropagation(); // Stop event from reaching OSD's own MouseTracker

    if (!selectedImage) return;

    evt.currentTarget.setPointerCapture(evt.pointerId);

    const { image, item } = selectedImage;

    // Get current selection reference canvas
    const canvas = reconstruction
      .find(r => r.id === selectedImage.item.reconstructionCanvasId);
    if (!canvas) return;

    const { width: canvasWidth } = canvas;
    const canvasScale = item.width / canvasWidth;

    origin.current = getPoint(evt, props.viewer);

    initialShape.current = {
      image, item, canvas,
      initialViewportPos: {
        x: item.x + image.x * canvasScale,
        y: item.y + image.y * canvasScale,
        width: image.width * canvasScale
      }
    };

    setIsUserEdit(true);    
  }

  const onPointerMove = (handle: HandleType) => (evt: React.PointerEvent) => {
    evt.stopPropagation();

    if (!origin.current || !evt.buttons) return;

    const pt = getPoint(evt, props.viewer);
    if (!pt) return;

    // X/Y delta in OSD viewport coordinates
    const delta = [pt.x - origin.current.x, pt.y - origin.current.y];

    if (handle === 'SHAPE') {
      if (editMode === 'CROP') 
        onMoveCrop(delta);
      else 
        onMoveImage(delta);
    } else if (editMode === 'CROP') {
      onCropImage(handle, delta);
    } else {
      onResizeImage(handle, delta);
    }
  }

  const onPointerUp = (evt: React.PointerEvent) => {
    evt.stopPropagation();

    const target = evt.target as Element;
    target.releasePointerCapture(evt.pointerId);

    const shape = initialShape.current;

    origin.current = undefined;
    initialShape.current = undefined;

    if (selectedImage && shape) {
      const { x, y, width } = shape.image;

      const { isValidDestination } = checkDestination(shape, intersectingItems)

      // Revert position if dropped at invalid destination
      if (!isValidDestination) {
        updateImage(shape.item.reconstructionCanvasId, {
          ...selectedImage.image,
          x, y, width
        });

        const revertedCorners = getImageCorners(selectedImage, shape.canvas.width, x, y, width);
        setIsValidDestination(true);
        updateIntersectingItems(revertedCorners);
      }
    }

    requestAnimationFrame(() => setIsUserEdit(false));
  }

  const onPointerCancel = (evt: React.PointerEvent) => {
    evt.stopPropagation();

    // Capture is auto-released by the browser on cancel
    origin.current = undefined;
    initialShape.current = undefined;
    setIsUserEdit(false);
  }

  const onDoubleClick = (evt: React.MouseEvent) => {
    evt.preventDefault();
    evt.stopPropagation();
    setEditMode(editMode === 'CROP' ? 'RESIZE' : 'CROP');
  }

  const onMoveImage = (delta: number[]) => {
    if (!selectedImage || !initialShape.current) return;

    const initialImg = initialShape.current.image;
    const initialItem = initialShape.current.item;
    const initialPos = initialShape.current.initialViewportPos;

    // New bounds in OSD viewport coordinaets
    const viewportX = initialPos.x + delta[0];
    const viewportY = initialPos.y + delta[1];
    
    const crop = initialImg.crop ?? {
      x: 0,
      y: 0,
      w: initialImg.resource.width,
      h: initialImg.resource.height
    };

    const aspect = crop.h / crop.w;
    const viewportHeight = initialPos.width * aspect;

    const intersecting = updateIntersectingItems([
      new Point(viewportX, viewportY),
      new Point(viewportX + initialPos.width, viewportY),
      new Point(viewportX + initialPos.width, viewportY + viewportHeight),
      new Point(viewportX, viewportY + viewportHeight)
    ]);

    const { 
      destination, 
      hasChangedDestination, 
      isValidDestination 
    } = checkDestination(initialShape.current, intersecting);

    if (hasChangedDestination && isValidDestination) {
      const source = reconstruction.find(r => r.id === initialItem.reconstructionCanvasId);
      const target = reconstruction.find(r => r.id === destination.reconstructionCanvasId);

      const targetItem = layout.items.find(i => i.reconstructionCanvasId === destination.reconstructionCanvasId);

      // Should never happen
      if (!source || !target || !targetItem) return;

      // Translate image into the new canvas's local coordinate system
      const { width: targetWidth } = target;
      const targetScale = targetItem.width / targetWidth;

      const targetImage = {
        ...initialImg,
        x: (viewportX - destination.x) / targetScale,
        y: (viewportY - destination.y) / targetScale,
        width: initialImg.width
      };

      const success = moveImageToCanvas(
        initialItem.reconstructionCanvasId,
        destination.reconstructionCanvasId,
        targetImage);

      if (success) {
        initialShape.current = {
          ...initialShape.current,
          item: targetItem,
          canvas: target
        };

        setSelectedCanvas([target]);
      }
    } else {
      const { width: canvasWidth } = initialShape.current.canvas;
      const canvasScale = initialItem.width / canvasWidth;

      const updatedImage: DraggableImage = {
        ...initialImg, 
        x: (viewportX - initialItem.x) / canvasScale,
        y: (viewportY - initialItem.y) / canvasScale
      }

      updateImage(initialItem.reconstructionCanvasId, updatedImage);
    }
  }

  const onMoveCrop = (delta: number[]) => {
    if (!selectedImage || !initialShape.current) return;

    const initialImage = initialShape.current.image;
    const initialCrop = initialImage.crop ?? {
      x: 0,
      y: 0,
      w: initialImage.resource.width,
      h: initialImage.resource.height
    };

    const imageScale = initialImage.width / initialCrop.w;
    const canvasScale = initialShape.current.item.width / initialShape.current.canvas.width;
    const viewportPerSourcePixel = imageScale * canvasScale;

    const fullImageX = initialImage.x - initialCrop.x * imageScale;
    const fullImageY = initialImage.y - initialCrop.y * imageScale;

    const x = Math.max(0, Math.min(
      initialImage.resource.width - initialCrop.w,
      initialCrop.x + delta[0] / viewportPerSourcePixel
    ));

    const y = Math.max(0, Math.min(
      initialImage.resource.height - initialCrop.h,
      initialCrop.y + delta[1] / viewportPerSourcePixel
    ));

    updateImage(initialShape.current.item.reconstructionCanvasId, {
      ...initialImage,
      x: fullImageX + x * imageScale,
      y: fullImageY + y * imageScale,
      crop: { ...initialCrop, x, y }
    });
  }

  const onCropImage = (handle: ResizeHandleType, delta: number[]) => {
    if (!selectedImage || !initialShape.current) return;

    const initialImage = initialShape.current.image;
    const initialCrop = initialImage.crop ?? {
      x: 0,
      y: 0,
      w: initialImage.resource.width,
      h: initialImage.resource.height
    };

    const imageScale = initialImage.width / initialCrop.w;
    const canvasScale = initialShape.current.item.width / initialShape.current.canvas.width;
    const viewportPerSourcePixel = imageScale * canvasScale;

    const dx = delta[0] / viewportPerSourcePixel;
    const dy = delta[1] / viewportPerSourcePixel;

    const signs = RESIZE_SIGNS[handle];

    const left = signs.h < 0 ? initialCrop.x + dx : initialCrop.x;
    const right = signs.h > 0 ? initialCrop.x + initialCrop.w + dx : initialCrop.x + initialCrop.w;
    const top = signs.v < 0 ? initialCrop.y + dy : initialCrop.y;
    const bottom = signs.v > 0 ? initialCrop.y + initialCrop.h + dy : initialCrop.y + initialCrop.h;
    
    const x = Math.max(0, Math.min(left, initialImage.resource.width - 1));
    const y = Math.max(0, Math.min(top, initialImage.resource.height - 1));
    const maxRight = initialImage.resource.width;
    const maxBottom = initialImage.resource.height;

    const nextCrop = {
      x,
      y,
      w: Math.max(1, Math.min(maxRight - x, right - x)),
      h: Math.max(1, Math.min(maxBottom - y, bottom - y))
    };

    const fullImageX = initialImage.x - initialCrop.x * imageScale;
    const fullImageY = initialImage.y - initialCrop.y * imageScale;

    updateImage(initialShape.current.item.reconstructionCanvasId, {
      ...initialImage,
      x: fullImageX + nextCrop.x * imageScale,
      y: fullImageY + nextCrop.y * imageScale,
      width: nextCrop.w * imageScale,
      crop: nextCrop
    });
  }

  const onResizeImage = (handle: ResizeHandleType, delta: number[]) => {
    if (!selectedImage || !initialShape.current) return;

    const { width: canvasWidth } = initialShape.current.canvas;
    const canvasScale = initialShape.current.item.width / canvasWidth;

    const dx = delta[0] / canvasScale;
    const dy = delta[1] / canvasScale;

    const { h, v } = RESIZE_SIGNS[handle];

    const initialImage = initialShape.current.image;

    const crop = initialImage.crop ?? {
      x: 0,
      y: 0,
      w: initialImage.resource.width,
      h: initialImage.resource.height
    };
    
    const aspect = crop.w / crop.h;
    const initialHeight = initialImage.width / aspect;

    const dWidthFromX = h * dx;
    const dWidthFromY = v * dy * aspect;

    const dWidth = Math.abs(dWidthFromX) >= Math.abs(dWidthFromY) ? dWidthFromX : dWidthFromY;

    const width = Math.max(1, initialImage.width + dWidth);
    const height = width / aspect;

    const x = h < 0 ? (initialImage.x + initialImage.width) - width : initialImage.x;
    const y = v < 0 ? (initialImage.y + initialHeight) - height : initialImage.y;

    // const liveCorners = getImageCorners(selectedImage, x, y, width);
    // const intersecting = updateIntersectingItems(liveCorners);

    updateImage(initialShape.current.item.reconstructionCanvasId, {
      ...initialImage,
      x, y, width
    });

    /*
    // TODO we should handle re-association after resize, too!
    const hasChangedItem = intersecting.length > 0 && selectedImage.canChangeItem &&
      intersecting.every(r => r.reconstructionCanvasId !== selectedImage.item.reconstructionCanvasId);

    const destinationId = hasChangedItem 
      ? intersecting[0].reconstructionCanvasId : selectedImage.item.reconstructionCanvasId;

    updateImage(destinationId, {
      ...selectedImage.image,
      x, y, width
    });
    */
  }

  return selectedImage ? (
    <>
      <g>
        {intersectingItems.length > 0 && (
          <polygon
            className="pointer-events-none"
            points={cornersToSvgPoints(corners)}
            fill="transparent"
            stroke="white"
            strokeWidth={5}
            vectorEffect="non-scaling-stroke" />
        )}

        <polygon
          className={editMode === 'CROP' ? 'cursor-move' : 'cursor-grab'}
          points={cornersToSvgPoints(corners)}
          fill={isValidDestination ? 'transparent' : 'oklch(57.7% 0.245 27.325 / 0.3)'}
          stroke={isValidDestination ? 'oklch(70.5% 0.213 47.604)' : 'oklch(57.7% 0.245 27.325)'}
          strokeWidth={isValidDestination ? 2.5 : 1.5}
          vectorEffect="non-scaling-stroke"
          strokeDasharray={isValidDestination ?  '5 2' : undefined}
          fillOpacity={editMode === 'CROP' ? 0.18 : undefined}
          onDoubleClickCapture={onDoubleClick}
          onPointerDownCapture={onPointerDown}
          onPointerMoveCapture={onPointerMove('SHAPE')}
          onPointerUpCapture={onPointerUp}
          onPointerCancelCapture={onPointerCancel} />

        {!isValidDestination && (
          <line 
            x1={corners[0].x}
            y1={corners[0].y} 
            x2={corners[2].x} 
            y2={corners[2].y} 
            stroke="oklch(57.7% 0.245 27.325)" 
            strokeWidth={1} 
            vectorEffect="non-scaling-stroke" />
        )}
        
        {corners.map((corner, i) => (
          <CornerHandle
            key={i}
            invalid={!isValidDestination}
            direction={
              i === 0 ? 'NW' :
              i === 1 ? 'NE' :
              i === 2 ? 'SE' :
              'SW'
            }
            corner={corner}
            type={HANDLE_TYPES[i]}
            viewer={props.viewer}
            size={editMode === 'CROP' ? 10 : undefined}
            fill={editMode === 'CROP' ? 'black' : undefined}
            stroke={editMode === 'CROP' ? 'white' : undefined}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove(HANDLE_TYPES[i])}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel} />
        ))}

        {editMode === 'CROP' && (
          <>
            <EdgeHandle
              point={new Point((corners[0].x + corners[1].x) / 2, corners[0].y)}
              direction="NS"
              type="TOP"
              viewer={props.viewer}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove('TOP')}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel} />
            <EdgeHandle
              point={new Point(corners[1].x, (corners[1].y + corners[2].y) / 2)}
              direction="EW"
              type="RIGHT"
              viewer={props.viewer}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove('RIGHT')}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel} />
            <EdgeHandle
              point={new Point((corners[2].x + corners[3].x) / 2, corners[2].y)}
              direction="NS"
              type="BOTTOM"
              viewer={props.viewer}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove('BOTTOM')}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel} />
            <EdgeHandle
              point={new Point(corners[0].x, (corners[0].y + corners[3].y) / 2)}
              direction="EW"
              type="LEFT"
              viewer={props.viewer}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove('LEFT')}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel} />
          </>
        )}
      </g>
    </>
  ) : null;

}
