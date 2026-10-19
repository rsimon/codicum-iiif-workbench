import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { Point, type Viewer } from 'openseadragon';
import type { TextAnnotation } from '@/types';

export interface TextAnnotationPlacement {

  annotation: TextAnnotation;

  x: number;

  y: number;

  width: number;

  height: number;

  scale: number;

  canvasWidth: number;

  canvasHeight: number;

}

interface TextAnnotationOverlayProps {

  placement: TextAnnotationPlacement;

  viewer?: Viewer;

  interactive?: boolean;

  editable?: boolean;

  selected?: boolean;

  showEmpty?: boolean;

  onSelect?(): void;

  onCommit?(annotation: TextAnnotation): void;

}

type Gesture = {

  type: 'move' | 'resize';

  pointer: Point;

  annotation: TextAnnotation;

}

const sameBounds = (a: TextAnnotation, b: TextAnnotation) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

export const TextAnnotationOverlay = (props: TextAnnotationOverlayProps) => {
  const { placement } = props;
  const annotation = placement.annotation;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gestureRef = useRef<Gesture | undefined>(undefined);
  const textRef = useRef(annotation.text);
  const [draft, setDraft] = useState(annotation);
  const [text, setText] = useState(annotation.text);
  const [viewportRevision, setViewportRevision] = useState(0);

  useEffect(() => {
    setDraft(annotation);
    textRef.current = annotation.text;
    setText(annotation.text);
  }, [annotation]);

  useEffect(() => {
    const viewer = props.viewer;
    if (!viewer) return;

    const update = () => setViewportRevision(revision => revision + 1);
    viewer.addHandler('update-viewport', update);

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(viewer.element);

    return () => {
      viewer.removeHandler('update-viewport', update);
      resizeObserver.disconnect();
    };
  }, [props.viewer]);

  useLayoutEffect(() => {
    if (props.editable && props.selected)
      textareaRef.current?.focus();
  }, [annotation.id, props.editable, props.selected]);

  const viewer = props.viewer;
  const screenPosition = (x: number, y: number) => viewer
    ? viewer.viewport.pixelFromPoint(new Point(x, y), true)
    : new Point(x, y);

  const worldX = placement.x + (draft.x - annotation.x) * placement.scale;
  const worldY = placement.y + (draft.y - annotation.y) * placement.scale;
  const topLeft = screenPosition(worldX, worldY);
  const bottomRight = screenPosition(
    worldX + draft.width * placement.scale,
    worldY + draft.height * placement.scale
  );
  const width = Math.max(1, bottomRight.x - topLeft.x);
  const height = Math.max(1, bottomRight.y - topLeft.y);
  const fontSize = Math.max(1, 64 * placement.scale * (
    viewer ? viewer.viewport.pixelFromPoint(new Point(1, 0), true).x -
      viewer.viewport.pixelFromPoint(new Point(0, 0), true).x : 1
  ));

  void viewportRevision;

  const getPointer = (event: PointerEvent<HTMLElement>) => {
    if (!viewer) return undefined;
    const rect = viewer.element.getBoundingClientRect();
    return viewer.viewport.pointFromPixel(new Point(
      event.clientX - rect.left,
      event.clientY - rect.top
    ));
  }

  const onGestureStart = (type: Gesture['type']) => (event: PointerEvent<HTMLElement>) => {
    if (!props.editable || !viewer) return;

    event.preventDefault();
    event.stopPropagation();
    props.onSelect?.();

    const pointer = getPointer(event);
    if (!pointer) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { type, pointer, annotation: draft };
  }

  const onGestureMove = (event: PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || !viewer) return;

    event.preventDefault();
    event.stopPropagation();

    const pointer = getPointer(event);
    if (!pointer) return;

    const dx = (pointer.x - gesture.pointer.x) / placement.scale;
    const dy = (pointer.y - gesture.pointer.y) / placement.scale;
    const initial = gesture.annotation;

    if (gesture.type === 'move') {
      setDraft({
        ...initial,
        x: Math.min(Math.max(0, initial.x + dx), placement.canvasWidth - initial.width),
        y: Math.min(Math.max(0, initial.y + dy), placement.canvasHeight - initial.height)
      });
    } else {
      const availableWidth = Math.max(0, placement.canvasWidth - initial.x);
      const availableHeight = Math.max(0, placement.canvasHeight - initial.y);
      setDraft({
        ...initial,
        width: Math.min(availableWidth, Math.max(Math.min(80, availableWidth), initial.width + dx)),
        height: Math.min(availableHeight, Math.max(Math.min(48, availableHeight), initial.height + dy))
      });
    }
  }

  const onGestureEnd = (event: PointerEvent<HTMLElement>) => {
    if (!gestureRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    gestureRef.current = undefined;

    if (!sameBounds(annotation, draft) || textRef.current !== annotation.text)
      props.onCommit?.({ ...draft, text: textRef.current });
  }

  const onTextBlur = () => {
    if (textRef.current !== annotation.text)
      props.onCommit?.({ ...draft, text: textRef.current });
  }

  if (text.length === 0 && !props.showEmpty && !props.selected)
    return null;

  const isEditing = props.editable && props.selected;

  return (
    <div
      className="absolute"
      style={{
        left: topLeft.x,
        top: topLeft.y,
        width,
        height,
        pointerEvents: isEditing ? 'auto' : props.interactive ? 'auto' : 'none'
      }}>
      <textarea
        ref={textareaRef}
        value={text}
        readOnly={!isEditing}
        tabIndex={isEditing || props.interactive ? 0 : -1}
        placeholder={isEditing ? 'Type here' : undefined}
        aria-label="Canvas annotation text"
        onChange={event => {
          textRef.current = event.target.value;
          setText(event.target.value);
        }}
        onFocus={() => {
          if (!props.selected) props.onSelect?.();
        }}
        onBlur={onTextBlur}
        onPointerDown={event => {
          event.stopPropagation();
          props.onSelect?.();
        }}
        onKeyDown={event => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        onKeyUp={event => event.stopPropagation()}
        className="size-full resize-none overflow-hidden border-0 outline-none"
        style={{
          boxSizing: 'border-box',
          fontFamily: 'inherit',
          fontSize,
          lineHeight: 1.25,
          padding: `${Math.max(1, fontSize / 8)}px`,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          color: '#171717',
          background: isEditing && !text ? 'rgba(255, 255, 255, 0.94)' : 'rgba(255, 255, 255, 0.84)',
          border: isEditing ? '1px solid oklch(0.5 0.15 246.78)' : '1px solid transparent',
          borderRadius: 2,
          cursor: isEditing ? 'text' : props.interactive ? 'text' : 'default'
        }} />

      {isEditing && (
        <>
          <div
            aria-label="Move annotation"
            className="absolute inset-x-1 top-0 h-1 cursor-move"
            onPointerDown={onGestureStart('move')}
            onPointerMove={onGestureMove}
            onPointerUp={onGestureEnd}
            onPointerCancel={onGestureEnd} />
          <div
            aria-label="Resize annotation"
            className="absolute -bottom-1.5 -right-1.5 size-3.5 cursor-nwse-resize rounded-sm border-2 border-primary bg-white"
            onPointerDown={onGestureStart('resize')}
            onPointerMove={onGestureMove}
            onPointerUp={onGestureEnd}
            onPointerCancel={onGestureEnd} />
        </>
      )}
    </div>
  )
}
