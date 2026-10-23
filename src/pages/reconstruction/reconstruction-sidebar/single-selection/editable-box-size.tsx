import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { parseNumber } from '@/store/app-store-utils';
import { Input } from '@/shadcn/input';
import { Field, FieldGroup, FieldLabel } from '@/shadcn/field';
import { isBlurLeavingGroup } from '../reconstruction-sidebar-utils';

export interface Box {

  x: number;

  y: number;

  width: number;

  height: number;

}

export interface EditableBoxSizeProps {

  lockAspectRatio?: boolean;

  value: Box;

  onCommit(box: Box): void;

}

type FieldKey = keyof Box;

type Draft = Record<FieldKey, string>;

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: 'x', label: 'x' },
  { key: 'y', label: 'y' },
  { key: 'width', label: 'w' },
  { key: 'height', label: 'h' },
];

// Unlike width/height, x/y may legitimately be zero or negative
// (a box can be dragged partially off-canvas).
const parseCoord = (s: string): number | undefined => {
  const n = Number.parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

const toDraft = (box: Box): Draft => ({
  x: String(Math.round(box.x)),
  y: String(Math.round(box.y)),
  width: String(Math.round(box.width)),
  height: String(Math.round(box.height)),
});

const INPUT_CLASS = 'tabular-nums h-7 p-1 shrink-0 field-sizing-content min-w-[4ch] max-w-[8ch]';
const TRIGGER_CLASS = 'w-full text-right tabular-nums hover:text-foreground hover:underline underline-offset-3 decoration-dotted cursor-text text-sm bg-muted py-0.5 px-1.5 rounded';
const FIELD_CLASS = 'col-span-2 grid grid-cols-subgrid w-auto gap-1.5 items-baseline';
const LABEL_CLASS = 'text-muted-foreground font-normal text-[10px] uppercase';

export const EditableBoxSize = (props: EditableBoxSizeProps) => {
  const { value, lockAspectRatio } = props;

  // Prevent division by zero edge case
  const aspectRatio = lockAspectRatio && value.width > 0 && value.height > 0
    ? value.width / value.height
    : undefined;

  const isLocked = aspectRatio !== undefined;

  const groupRef = useRef<HTMLDivElement>(null);
  const focusKeyRef = useRef<FieldKey>('x');

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(value));

  // Which size the user edited last (only relevant when aspect ratio locked)
  const [sizeSource, setSizeSource] = useState<'width' | 'height'>('width');

  useEffect(() => {
    if (!isEditing) return;

    setDraft(toDraft(value));
    setSizeSource('width');

    const frameId = requestAnimationFrame(() => {
      const input = groupRef.current?.querySelector<HTMLInputElement>(
        `input[data-field="${focusKeyRef.current}"]`);

      input?.focus();
      input?.select();
    });

    return () => cancelAnimationFrame(frameId);
  }, [isEditing]);

  const onChange = (key: FieldKey, text: string) => {
    const next: Draft = { ...draft, [key]: text };

    if (isLocked && (key === 'width' || key === 'height')) {
      setSizeSource(key);

      const n = parseNumber(text);
      if (n !== undefined) {
        if (key === 'width') next.height = String(Math.round(n / aspectRatio));
        else next.width = String(Math.round(n * aspectRatio));
      }
    }

    setDraft(next);
  }

  const onCommit = () => {
    const x = parseCoord(draft.x);
    const y = parseCoord(draft.y);
    const w = parseNumber(draft.width);
    const h = parseNumber(draft.height);

    let width = w;
    let height = h;

    if (isLocked) {
      if (sizeSource === 'height') {
        width = h === undefined ? undefined : h * aspectRatio;
      }
      height = width === undefined ? undefined : width / aspectRatio;
    }

    if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
      props.onCommit({ x, y, width, height });
    }

    setIsEditing(false);
  }

  const onCancel = () => setIsEditing(false);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }

    e.stopPropagation();
  }

  const onGroupBlur = (e: FocusEvent) => {
    if (isBlurLeavingGroup(e, groupRef.current)) onCommit();
  }

  return (
    <FieldGroup
      ref={groupRef}
      onBlur={onGroupBlur}
      className="gap-1 p-0.5">
      <div className="grid w-full grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-1.5 items-baseline">
        {FIELDS.map(({ key, label }, idx) => (
          <Field key={key} orientation="horizontal" className={FIELD_CLASS}>
            <FieldLabel htmlFor={`size-${idx}`} className={LABEL_CLASS}>
              {label}
            </FieldLabel>
            {isEditing ? (
              <Input
                id={`size-${idx}`}
                data-field={key}
                value={draft[key]}
                onChange={e => onChange(key, e.target.value)}
                onKeyDown={onKeyDown}
                className={INPUT_CLASS} />
            ) : (
              <button
                type="button"
                id={`size-${idx}`}
                onClick={() => {
                  focusKeyRef.current = key;
                  setIsEditing(true);
                }}
                className={TRIGGER_CLASS}>
                {Math.round(value[key])}
              </button>
            )}
          </Field>
        ))}
      </div>
    </FieldGroup>
  )

}