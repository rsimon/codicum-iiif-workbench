import { IconCheck, IconMinus } from "@tabler/icons-react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"

import { cn } from "./utils"

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 cursor-pointer flex items-center justify-center shrink-0 rounded border border-input shadow-xs outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-primary data-checked:text-primary-foreground data-checked:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground data-indeterminate:border-primary dark:bg-input/30 dark:data-checked:bg-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
        render={(props, state) => (
          <span {...props}>
            {state.indeterminate ? (
              <IconMinus className="size-3" strokeWidth={2.5} />
            ) : (
              <IconCheck className="size-3" strokeWidth={2.5} />
            )}
          </span>
        )}>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
