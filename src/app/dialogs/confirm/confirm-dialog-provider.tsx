import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/shadcn/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shadcn/alert-dialog';

export interface ConfirmOptions {

  title: ReactNode;

  description?: ReactNode;

  confirmLabel?: string;

  cancelLabel?: string;

  variant?: 'default' | 'destructive';

}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

export const ConfirmDialogProvider = (props: { children: ReactNode }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const resolveRef = useRef<(confirmed: boolean) => void>(undefined);

  const confirm = useCallback<ConfirmFn>(options => {
    return new Promise(resolve => {
      resolveRef.current = resolve;
      setOptions(options);
    });
  }, []);

  const settle = (confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = undefined;
    setOptions(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {props.children}

      <AlertDialog
        open={options !== null}
        onOpenChange={open => {
          if (!open) settle(false);
        }}>
        {options && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{options.title}</AlertDialogTitle>
              {options.description && (
                <AlertDialogDescription>{options.description}</AlertDialogDescription>
              )}
            </AlertDialogHeader>

            <AlertDialogFooter>
              <Button
                variant="ghost"
                className="tracking-wide"
                onClick={() => settle(false)}>
                {options.cancelLabel || 'Cancel'}
              </Button>

              <Button
                variant={options.variant === 'destructive' ? 'destructive' : 'default'}
                className="tracking-wide"
                onClick={() => settle(true)}>
                {options.confirmLabel || 'Confirm'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </ConfirmContext.Provider>
  )

}

export const useConfirm = () => {
  const confirm = useContext(ConfirmContext);

  if (!confirm)
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');

  return confirm;
}
