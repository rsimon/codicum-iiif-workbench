import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Editor, JSONContent } from '@tiptap/react';
import type { Viewer } from 'openseadragon';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import { TiptapEditor } from '@/components/tiptap-editor';
import { TiptapReadOnlyView } from '@/components/tiptap-readonly-view';
import { cn } from '@/shadcn/utils';
import type { TextAnnotation } from '@/types';
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
      editor?.commands.blur();
    }
  }

  const onBlur = () => {
    if (gestureRef.current) return; // a handle drag is in progress
    if (isEmptyDoc(docRef.current)) props.onRemove();
    else commit();

    setSelectedTextAnnotation();
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

      <div
        ref={setContentEl}
        className={cn(
          'size-full box-border overflow-hidden',
          isSelected ? 'cursor-text' : 'cursor-default'
        )}
        style={{
          fontSize: annotation.fontSize,
          paddingLeft: annotation.fontSize / 5,
          paddingRight: annotation.fontSize / 5,
          background: isSelected ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.35)',
          border: `${counterScale(1.5)} dashed ${isSelected ? 'oklch(14.5% 0 none)' : 'transparent'}`
        }}
        onKeyDown={onKeyDown}
        onKeyUp={evt => evt.stopPropagation()}>

        {isSelected ? (
          <TiptapEditor
            doc={doc}
            onEditor={setEditor}
            onContentChange={onContentChange}
            onBlur={onBlur} />
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
              onMouseDown={evt => evt.preventDefault()}>  {/* keep focus in the editor */}
              <TextAnnotationToolbar
                editor={editor}
                dragHandleProps={gestureHandlers('move')} />
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  )

}