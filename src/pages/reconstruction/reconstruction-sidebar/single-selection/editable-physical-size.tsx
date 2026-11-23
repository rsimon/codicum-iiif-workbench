import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { getPPI } from '@/dialogs/physical-dimensions';
import { Field, FieldGroup, FieldLabel } from '@/shadcn/field';
import { Input } from '@/shadcn/input';
import { parseNumber } from '@/store/app-store-utils';
import type { PhysicalSize, ReconstructionCanvas } from '@/types';
import { isBlurLeavingGroup } from '../reconstruction-sidebar-utils';

interface EditablePhysicalSizeProps {

  canvas: ReconstructionCanvas;

  onCommit(size?: PhysicalSize): void;

}

const formatPhysicalSize = (size: PhysicalSize): string =>
  `${size.width} × ${size.height} ${size.unit}`;

export const EditablePhysicalSize = (props: EditablePhysicalSizeProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const [widthStr, setWidthStr] = useState('');
  const [heightStr, setHeightStr] = useState('');
  const [unitStr, setUnitStr] = useState('');

  const size = props.canvas.physicalSize;

  const groupRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) return;

    setWidthStr(size ? String(size.width) : '');
    setHeightStr(size ? String(size.height) : '');
    setUnitStr(size?.unit ?? '');

    const frameId = requestAnimationFrame(() => {
      widthRef.current?.focus();
      widthRef.current?.select();
    });

    return () => cancelAnimationFrame(frameId);
  }, [isEditing]);

  const onCommit = () => {
    const w = parseNumber(widthStr);
    const h = parseNumber(heightStr);
    const unit = unitStr.trim();

    if (w && h && unit) {
      props.onCommit({ width: w, height: h, unit });
    } else if (!widthStr.trim() && !heightStr.trim() && !unit) {
      // All fields cleared -- remove the physical size entirely.
      props.onCommit(undefined);
    }

    setIsEditing(false);
  }

  const onCancel = () => {
    setWidthStr(size ? String(size.width) : '');
    setHeightStr(size ? String(size.height) : '');
    setUnitStr(size?.unit ?? '');
    setIsEditing(false);
  }

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

  const ppi = size ? getPPI(size, props.canvas) : undefined;

  return isEditing ? (
    <FieldGroup
      ref={groupRef}
      onBlur={onGroupBlur}
      className="flex-row items-center gap-2">
      <Field orientation="horizontal" className="w-fit">
        <FieldLabel htmlFor="physical-width" className="sr-only">
          Width
        </FieldLabel>
        <Input
          id="physical-width"
          ref={widthRef}
          placeholder="–"
          value={widthStr}
          onChange={e => setWidthStr(e.target.value)}
          onKeyDown={onKeyDown}
          className="tabular-nums shrink-0 h-7 p-1 field-sizing-content min-w-[4ch] max-w-[8ch]" />
      </Field>

      <span className="text-muted-foreground">×</span>

      <Field orientation="horizontal" className="w-fit">
        <FieldLabel htmlFor="physical-height" className="sr-only">
          Height
        </FieldLabel>
        <Input
          id="physical-height"
          placeholder="–"
          value={heightStr}
          onChange={e => setHeightStr(e.target.value)}
          onKeyDown={onKeyDown}
          className="tabular-nums shrink-0 h-7 p-1 field-sizing-content min-w-[4ch] max-w-[8ch]" />
      </Field>

      <Field orientation="horizontal" className="w-fit">
        <FieldLabel htmlFor="physical-unit" className="sr-only">
          Unit
        </FieldLabel>
        <Input
          id="physical-unit"
          placeholder="unit"
          value={unitStr}
          onChange={e => setUnitStr(e.target.value)}
          onKeyDown={onKeyDown}
          className="tabular-nums shrink-0 h-7 p-1 field-sizing-content min-w-[4ch] max-w-[6ch]" />
      </Field>
    </FieldGroup>
  ) : size? (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="tabular-nums hover:text-foreground hover:underline underline-offset-2 decoration-dotted cursor-text text-sm">
        {formatPhysicalSize(size)}
      </button>

      {ppi && (
        <p className="text-xs text-muted-foreground">
          ≈ {(Math.round(100 * ppi) / 100).toLocaleString()} ppi
        </p>
      )}
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="text-primary mt-px flex text-xs gap-0.5 items-center hover:underline cursor-pointer underline-offset-2 decoration-dotted">
      <IconPlus className="size-3.5" /> Set dimensions
    </button>
  )

}
