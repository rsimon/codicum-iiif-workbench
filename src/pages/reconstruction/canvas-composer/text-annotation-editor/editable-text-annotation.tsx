import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Viewer } from 'openseadragon';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import { cn } from '@/shadcn/utils';
import type { TextAnnotation } from '@/types';
import { useMousewheelForward } from '../use-mousewheel-forward';
import { counterScale, EDGE_HANDLES } from './text-annotation-editor-utils';
import { TextAnnotationToolbar } from './text-annotation-toolbar';

// Text box initial size - canvas pixels
const INITIAL_WIDTH = 40;
const INITIAL_HEIGHT = 24;

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

  viewer: Viewer;

  // Screen pixels per canvas pixel
  getScale(): number;

  onChange(updated: TextAnnotation): void;

  onRemove(): void;

}

const hasChanged = (a: TextAnnotation, b: TextAnnotation) =>
  a.x !== b.x || a.y !== b.y || a.width !== b.width || a.height !== b.height || a.text !== b.text;

export const EditableTextAnnotation = (props: EditableTextAnnotationProps) => {
  const { annotation, isSelected = false, viewer, getScale } = props;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef(annotation.text);
  const draftRef = useRef(annotation);
  const gestureRef = useRef<Gesture | undefined>(undefined);

  const [draft, setDraftState] = useState(annotation);
  const [text, setText] = useState(annotation.text);

  useMousewheelForward(textareaRef.current, props.viewer);

  const { refs, floatingStyles } = useFloating({
    placement: 'top',
    strategy: 'fixed',
    middleware: [offset(12), flip(), shift({ padding: 8 })],
    // animationFrame re-measures every frame, so the panel tracks
    // dragging, resizing, and OSD pan/zoom without extra wiring
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true })
  });

  const setDraft = (next: TextAnnotation) => {
    draftRef.current = next;
    setDraftState(next);
  }

  const commit = () => {
    const next = { ...draftRef.current, text: textRef.current };
    if (hasChanged(next, annotation)) props.onChange(next);
  }

  // flush on unmount (a focused layer can unmount without a blur)
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
        width: Math.max(INITIAL_WIDTH, origin.width + dx),
        height: Math.max(INITIAL_HEIGHT, origin.height + dy)
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
      ref={refs.setReference}
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
        className={cn(
          `size-full resize-none overflow-hidden outline-none whitespace-pre-wrap 
           leading-relaxed box-border wrap-break-word`,
          isSelected ? 'cursor-text' : 'cursor-default border-transparent'
        )}
        value={text}
        readOnly={!isSelected}
        tabIndex={isSelected ? 0 : -1}
        placeholder={isSelected ? 'Type here' : undefined}
        onChange={evt => onTextChange(evt.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onKeyUp={evt => evt.stopPropagation()}
        style={{
          fontSize: annotation.fontSize,
          padding: annotation.fontSize / 2,
          background: isSelected ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.35)',
          border: `${counterScale(1.5)} dashed ${isSelected ? 'oklch(14.5% 0 none)' : 'transparent'}`
        }} />

      {isSelected && (
        <>
          {Object.entries(EDGE_HANDLES).map(([name, style]) => (
            <div
              key={name}
              aria-label={`Move annotation (${name} edge)`}
              className="absolute cursor-move touch-none"
              style={style}
              {...gestureHandlers('move')} />
          ))}

          <div
            aria-label="Resize annotation"
            className="absolute rounded-full cursor-nwse-resize touch-none border border-neutral-950 bg-white"
            style={{
              right: counterScale(-5),
              bottom: counterScale(-5),
              width: counterScale(10),
              height: counterScale(10),
              borderWidth: counterScale(1.5)
            }}
            {...gestureHandlers('resize')} />

          {createPortal(
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="z-50"
              onMouseDown={evt => evt.preventDefault()}>  {/* keep focus in the textarea */}
              <TextAnnotationToolbar 
                dragHandleProps={gestureHandlers('move')} />
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  )

}