import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Editor, JSONContent } from '@tiptap/react';
import type { Viewer } from 'openseadragon';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import { FONT_SIZE_RATIO, TiptapEditor } from '@/components/tiptap-editor';
import { TiptapReadOnlyView } from '@/components/tiptap-readonly-view';
import { cn } from '@/shadcn/utils';
import type { ReconstructionCanvas, TextAnnotation } from '@/types';
import { useComposerStore } from '../../composer-store';
import { useMousewheelForward } from '../../use-mousewheel-forward';
import { isEmptyDoc } from './editable-text-annotation-utils';
import { counterScale, EDGE_HANDLES } from './editable-text-annotation-utils';
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

  canvas: ReconstructionCanvas;

  annotation: TextAnnotation;

  isSelected?: boolean;

  viewer: Viewer;

  // Screen pixels per canvas pixel
  getScale(): number;

  onChange(updated: TextAnnotation): void;

  onRemove(): void;

}

const geometryChanged = (a: TextAnnotation, b: TextAnnotation) =>
  a.x !== b.x || a.y !== b.y || a.width !== b.width || a.height !== b.height;

export const EditableTextAnnotation = (props: EditableTextAnnotationProps) => {
  const { annotation, isSelected = false, viewer, getScale } = props;

  const setSelectedTextAnnotation = useComposerStore(state => state.setSelectedTextAnnotation);

  const draftRef = useRef(annotation);
  const gestureRef = useRef<Gesture | undefined>(undefined);

  // The latest content, written by the editor on every change. A ref, so
  // typing doesn't re-render this component.
  const docRef = useRef(annotation.content);

  // The latest content the parent knows about
  const savedRef = useRef(annotation.content);

  const [draft, setDraftState] = useState(annotation);

  // What the static view renders
  const [doc, setDoc] = useState(annotation.content);

  // The live editor exists only while selected; the toolbar needs it
  const [editor, setEditor] = useState<Editor | null>(null);

  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);

  useMousewheelForward(contentEl, props.viewer);

  const { refs, floatingStyles } = useFloating({
    placement: 'top',
    strategy: 'fixed',
    middleware: [offset(10), flip(), shift({ padding: 8 })],
    // animationFrame re-measures every frame, so the panel tracks
    // dragging, resizing, and OSD pan/zoom without extra wiring
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true })
  });

  const setDraft = (next: TextAnnotation) => {
    draftRef.current = next;
    setDraftState(next);
  }

  // The editor replaces docRef.current on every edit, so a different
  // reference means there is content the parent hasn't seen yet
  const hasUnsavedContent = () => docRef.current !== savedRef.current;

  const commit = () => {
    const next: TextAnnotation = { ...draftRef.current, content: docRef.current };

    if (!hasUnsavedContent() && !geometryChanged(next, annotation)) return;

    savedRef.current = docRef.current;
    setDoc(docRef.current);
    props.onChange(next);
  }

  // flush on unmount (a focused layer can unmount without a blur)
  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => () => {
    if (!isEmptyDoc(docRef.current)) commitRef.current();
  }, []);

  const wasSelectedRef = useRef(isSelected);

  useEffect(() => {
    if (wasSelectedRef.current && !isSelected) {
      if (isEmptyDoc(docRef.current)) 
        props.onRemove();
      else 
        commit();
    }

    wasSelectedRef.current = isSelected;
  }, [isSelected]);

  useEffect(() => {
    // Don't clobber a gesture or unsaved edits with a stale prop
    if (gestureRef.current || hasUnsavedContent()) return;

    draftRef.current = annotation;
    setDraftState(annotation);

    docRef.current = savedRef.current = annotation.content;
    setDoc(annotation.content);
  }, [annotation]);

  const onContentChange = (next: JSONContent) => {
    docRef.current = next;
  }

  const onKeyDown = (evt: KeyboardEvent<HTMLDivElement>) => {
    // Keep OSD from reacting to shortcuts (+, -, arrows, w/a/s/d, ...).
    // ProseMirror has already handled the key by the time it gets here.
    evt.stopPropagation();

    if (evt.key === 'Escape') {
      evt.preventDefault();
      setSelectedTextAnnotation();
    }
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

  const keepFocus = (evt: MouseEvent) => {
    // Keeps focus to the Tiptap editor, except for toolbar
    // elements that don't work without focus
    if (!(evt.target as HTMLElement).closest('input')) 
      evt.preventDefault();
  }

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

      <div
        ref={setContentEl}
        className={cn(
          'size-full box-border',
          isSelected ? 'cursor-text' : 'cursor-default'
        )}
        style={{
          fontSize: Math.round(props.canvas.width * FONT_SIZE_RATIO),
          background: isSelected ? 'oklch(0.92 0.03 248.81 / 0.35)' : 'rgba(255, 255, 255, 0.35)',
          borderRadius: `${counterScale(2)}`,
          border: `${counterScale(1)} ${isSelected ? 'dashed oklch(0.5 0.15 246.78)' : 'solid oklch(70.8% 0 none / 0.25)'}`,
          padding: `0 ${counterScale(4)}px`
        }}
        onKeyDown={onKeyDown}
        onKeyUp={evt => evt.stopPropagation()}>

        {isSelected ? (
          <TiptapEditor
            doc={doc}
            onEditor={setEditor}
            onContentChange={onContentChange} />
        ) : (
          <TiptapReadOnlyView 
            doc={doc} />
        )}
      </div>

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
            className="absolute rounded-full cursor-nwse-resize touch-none border border-primary bg-accent"
            style={{
              right: counterScale(-4.5),
              bottom: counterScale(-4.5),
              width: counterScale(10),
              height: counterScale(10),
              borderWidth: counterScale(1.25)
            }}
            {...gestureHandlers('resize')} />

          {createPortal(
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="z-50"
              onMouseDown={keepFocus}>
              <TextAnnotationToolbar
                editor={editor}
                viewer={viewer}
                dragHandleProps={gestureHandlers('move')}
                onDelete={props.onRemove} />
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  )

}