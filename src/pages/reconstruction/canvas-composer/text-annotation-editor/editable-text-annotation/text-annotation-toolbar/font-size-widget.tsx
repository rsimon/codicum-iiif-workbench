import { IconMinus, IconPlus } from '@tabler/icons-react';
import { Button } from '@/shadcn/button';

interface FontSizeWidgetProps {

  fontSize: number;

  onChange(fontSize: number): void;

}

export const FontSizeWidget = (props: FontSizeWidgetProps) => {
  const { fontSize, onChange } = props;

  return (
    <div className="flex gap-0.5 items-stretch">
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onChange(fontSize + 1)}>
        <IconPlus className="size-3.5" />
      </Button>

      <div className="rounded-sm border text-xs p-1 flex items-center justify-center min-w-7">
        {fontSize}
      </div>

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onChange(Math.max(1, fontSize - 1))}>
        <IconMinus className="size-3.5" />
      </Button>
    </div>
  )

}