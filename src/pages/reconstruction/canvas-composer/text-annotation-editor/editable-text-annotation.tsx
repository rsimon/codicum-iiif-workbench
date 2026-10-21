import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Viewer } from 'openseadragon';
import type { TextAnnotation } from '@/types';

// Canvas pixels
const DEFAULT_FONT_SIZE = 24;
const MIN_WIDTH = 40;
const MIN_HEIGHT = 24;

const counterScale = (px: number) => `calc(${px}px / var(--osd-scale, 1))`;

type GestureKind = 'move' | 'resize';

interface Gesture {

  kind: GestureKind;

  pointerId: number;

  startX: number;

  startY: number;

  origin: TextAnnotation;

  // Screen pixels per canvas pixel when the gesture started
  scale: number;

}

interface EditableTextAnnotationProps {

  annotation: TextAnnotation;

  isSelected?: boolean;

  // Canvas pixels - TODO: read from the annotation later
  fontSize?: number;

  viewer: Viewer;

  // Screen pixels per canvas pixel
  getScale(): number;

  onChange(updated: TextAnnotation): void;

  onRemove(): void;

}

const hasChanged = (a: TextAnnotation, b: TextAnnotation) =>
  a.x !== b.x || a.y !== b.y || a.width !== b.width || a.height !== b.height || a.text !== b.text;

export const EditableTextAnnotation = (props: EditableTextAnnotationProps) => {
  const { annotation, isSelected = false, fontSize = DEFAULT_FONT_SIZE, viewer, getScale } = props;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef(annotation.text);
  const draftRef = useRef(annotation);
  const gestureRef = useRef<Gesture | undefined>(undefined);

  const [draft, setDraftState] = useState(annotation);
  const [text, setText] = useState(annotation.text);

  const setDraft = (next: TextAnnotation) => {
    draftRef.current = next;
    setDraftState(next);
  }

  const commit = () => {
    const next = { ...draftRef.current, text: textRef.current };
    if (hasChanged(next, annotation)) props.onChange(next);
  }

  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => () => {
    if (textRef.current.trim()) commitRef.current();
  }, []);

  useEffect(() => {
    if (gestureRef.current) return;

    draftRef.current = annotation;
    setDraftState(annotation);

    textRef.current = annotation.text;
    setText(annotation.text);
  }, [annotation]);

  useEffect(() => {
    if (isSelected) textareaRef.current?.focus({ preventScroll: true });
  }, [isSelected]);

  const onTextChange = (value: string) => {
    textRef.current = value;
    setText(value);
  }

  const onKeyDown = (evt: KeyboardEvent<HTMLTextAreaElement>) => {
    // Keep OSD from reacting to shortcuts (+, -, arrows, w/a/s/d, ...)
    evt.stopPropagation();

    if (evt.key === 'Escape') {
      evt.preventDefault();
      evt.currentTarget.blur();
    }
  }

  const onBlur = () => {
    if (gestureRef.current) return; // a handle drag is in progress
    if (!textRef.current.trim()) props.onRemove();
    else commit();
  }

  const onGestureStart = (kind: GestureKind) => (evt: PointerEvent<HTMLDivElement>) => {
    if (evt.button !== 0) return;

    // Stop OSD from starting a pan
    evt.preventDefault();
    evt.stopPropagation();

    evt.currentTarget.setPointerCapture(evt.pointerId);

    gestureRef.current = {
      kind,
      pointerId: evt.pointerId,
      startX: evt.clientX,
      startY: evt.clientY,
      origin: draftRef.current,
      scale: getScale()
    };

    viewer.setMouseNavEnabled(false);
  }

  const onGestureMove = (evt: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== evt.pointerId) return;

    // Screen delta -> canvas delta
    const dx = (evt.clientX - gesture.startX) / gesture.scale;
    const dy = (evt.clientY - gesture.startY) / gesture.scale;

    const { origin } = gesture;

    setDraft(gesture.kind === 'move'
      ? { ...origin, x: origin.x + dx, y: origin.y + dy }
      : {
        ...origin,
        width: Math.max(MIN_WIDTH, origin.width + dx),
        height: Math.max(MIN_HEIGHT, origin.height + dy)
      });
  }

  const onGestureEnd = (evt: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== evt.pointerId) return;

    gestureRef.current = undefined;

    if (evt.currentTarget.hasPointerCapture(evt.pointerId))
      evt.currentTarget.releasePointerCapture(evt.pointerId);

    viewer.setMouseNavEnabled(true);
    commit();
  }

  const gestureHandlers = (kind: GestureKind) => ({
    onPointerDown: onGestureStart(kind),
    onPointerMove: onGestureMove,
    onPointerUp: onGestureEnd,
    onPointerCancel: onGestureEnd
  });

  return (
    <div
      className="absolute"
      style={{
        left: draft.x,
        top: draft.y,
        width: draft.width,
        height: draft.height,
        pointerEvents: isSelected ? 'auto' : 'none'
      }}
      onPointerDown={evt => evt.stopPropagation()}>

      <textarea
        ref={textareaRef}
        className="size-full resize-none overflow-hidden outline-none whitespace-pre-wrap"
        value={text}
        readOnly={!isSelected}
        tabIndex={isSelected ? 0 : -1}
        placeholder={isSelected ? 'Type here' : undefined}
        onChange={evt => onTextChange(evt.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onKeyUp={evt => evt.stopPropagation()}
        style={{
          boxSizing: 'border-box',
          fontFamily: 'inherit',
          fontSize,
          lineHeight: 1.25,
          padding: fontSize / 8,
          overflowWrap: 'break-word',
          color: '#171717',
          background: isSelected && !text ? 'rgba(255, 255, 255, 0.94)' : 'rgba(255, 255, 255, 0.84)',
          border: `${counterScale(1)} solid ${isSelected ? 'oklch(0.5 0.15 246.78)' : 'transparent'}`,
          borderRadius: 2,
          cursor: isSelected ? 'text' : 'default'
        }} />

      {isSelected && (
        <>
          <div
            aria-label="Move annotation"
            className="absolute inset-x-0 cursor-move touch-none rounded-sm bg-primary"
            style={{ top: counterScale(-12), height: counterScale(10) }}
            {...gestureHandlers('move')} />

          <div
            aria-label="Resize annotation"
            className="absolute cursor-nwse-resize touch-none rounded-sm border-primary bg-white"
            style={{
              right: counterScale(-7),
              bottom: counterScale(-7),
              width: counterScale(14),
              height: counterScale(14),
              borderStyle: 'solid',
              borderWidth: counterScale(2)
            }}
            {...gestureHandlers('resize')} />
        </>
      )}
    </div>
  )

}