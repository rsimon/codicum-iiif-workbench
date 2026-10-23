import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import { Button } from '@/shadcn/button';
import { Input } from '@/shadcn/input';

interface FontSizeWidgetProps {

  fontSize: number;

  onChange(fontSize: number): void;

}

export const FontSizeWidget = (props: FontSizeWidgetProps) => {
  const { fontSize, onChange } = props;

  const ref = useRef<HTMLInputElement | null>(null);

  const [fontSizeStr, setFontSizeStr] = useState(`${fontSize}`);

  useEffect(() => setFontSizeStr(`${fontSize}`), [fontSize]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const parsed = parseInt(fontSizeStr);
      if (!isNaN(parsed))
        onChange(parsed);
      
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setFontSizeStr(`${fontSize}`);
      e.preventDefault();
    }

    e.stopPropagation();
  }
  
  return (
    <div className="flex gap-0.5 items-stretch">
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onChange(fontSize + 1)}>
        <IconPlus className="size-3.5" />
      </Button>

      <Input
        id="pixel-width"
        ref={ref}
        size={2}
        value={fontSizeStr}
        onChange={e => setFontSizeStr(e.target.value)}
        onKeyDown={onKeyDown}
        className="tabular-nums h-auto field-sizing-content rounded-sm text-xs py-0.5 px-1.5" />

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onChange(Math.max(1, fontSize - 1))}>
        <IconMinus className="size-3.5" />
      </Button>
    </div>
  )

}