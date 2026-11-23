import { useState } from 'react';
import { Toolbar } from '@base-ui/react/toolbar';
import { IconLetterA } from '@tabler/icons-react';
import { Button } from '@/shadcn/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/shadcn/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/shadcn/popover';
import { RadioGroup, RadioGroupItem } from '@/shadcn/radio-group';

const PRESET_COLORS = [
  { name: 'Black',   value: '#1A1A1A' },
  { name: 'Grey',    value: '#6B7280' },
  { name: 'Red',     value: '#CC0000' },
  { name: 'Amber',   value: '#B45309' },
  { name: 'Green',   value: '#15803D' },
  { name: 'Blue',    value: '#2563EB' },
  { name: 'Purple',  value: '#7C3AED' },
  { name: 'Magenta', value: '#C026D3' }
];

const DEFAULT_COLOR = PRESET_COLORS[0].value;

// Accepts #abc, abc, #aabbcc, aabbcc and returns #AABBCC / undefined if invalid.
const normalizeHex = (input: string): string | undefined => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!match) return;

  const hex =
    match[1].length === 3
      ? match[1].split('').map((c) => c + c).join('')
      : match[1];

  return `#${hex.toUpperCase()}`;
};

interface TextColorWidgetProps {
  color?: string;
  onChange(color?: string): void;
}

export const TextColorWidget = (props: TextColorWidgetProps) => {
  const current = props.color?.toUpperCase() ?? DEFAULT_COLOR;

  const [draft, setDraft] = useState(current);

  const apply = (value: string) =>
    props.onChange(value === DEFAULT_COLOR ? undefined : value);

  const onPresetChange = (value: string) => {
    if (!value) return;
    setDraft(value);
    apply(value);
  };

  const onHexChange = (value: string) => {
    setDraft(value);
    const normalized = normalizeHex(value);
    if (normalized) apply(normalized);
  };

  const preview = normalizeHex(draft) ?? current;

  return (
    <Popover onOpenChange={(open) => open && setDraft(current)}>
      <PopoverTrigger
        render={
          <Toolbar.Button
            render={
              <Button
                variant="ghost"
                className="rounded-sm size-7"
                aria-label="Text color"
              />
            }
          />
        }>
        <div className="flex flex-col items-center gap-px">
          <IconLetterA className="size-3.5" />
          <div
            className="h-0.75 w-3 rounded"
            style={{ backgroundColor: current }}
          />
        </div>
      </PopoverTrigger>

      <PopoverContent
        aria-label="Text color"
        className="w-34 p-3 gap-3"
        sideOffset={11}
        initialFocus={(type) => type === 'keyboard'}
        finalFocus={(type) => type === 'keyboard'}>
        <RadioGroup
          aria-label="Preset colors"
          className="flex flex-row w-full justify-between p-0.5 pb-0 flex-wrap gap-2"
          value={current}
          onValueChange={onPresetChange}>
          {PRESET_COLORS.map((preset) => (
            <RadioGroupItem
              key={preset.value}
              value={preset.value}
              aria-label={preset.name}
              className="size-5 min-w-5 rounded-full p-0 shadow-none aria-checked:ring-2 aria-checked:ring-ring aria-checked:ring-offset-2 aria-checked:ring-offset-popover [&_[data-slot=radio-group-indicator]]:hidden"
              style={{
                backgroundColor: preset.value,
                border: `1px solid color-mix(in oklch, ${preset.value} 80%, black)`
              }}
            />
          ))}
        </RadioGroup>

        <InputGroup className="h-8">
          <InputGroupAddon>
            <span
              className="h-4 w-2 rounded border"
              style={{ backgroundColor: preview }} />
          </InputGroupAddon>

          <InputGroupInput
            aria-label="Hex color"
            value={draft}
            maxLength={7}
            spellCheck={false}
            className="text-right"
            onChange={(e) => onHexChange(e.target.value)}
            onBlur={() => {
              if (!normalizeHex(draft)) setDraft(current);
            }} />
        </InputGroup>
      </PopoverContent>
    </Popover>
  )

}