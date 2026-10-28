import type { ButtonProps } from '@base-ui/react';
import { Button } from '@/shadcn/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shadcn/tooltip';

export const ToolbarButton = (props: ButtonProps & { tooltip: string }) => {
  const { children, ...rest } = props;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            className="rounded-full"
            {...rest}>
            {children}
          </Button>
        }/>
      <TooltipContent>
        {props.tooltip}
      </TooltipContent>
    </Tooltip>
  )
  
}