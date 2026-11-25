import { Checkbox } from '@/shadcn/checkbox';
import { RadioGroup, RadioGroupItem } from '@/shadcn/radio-group';
import { useBulkSettings } from './bulk-settings-context';
import { 
  Field, 
  FieldContent, 
  FieldDescription, 
  FieldGroup, 
  FieldLabel, 
  FieldLegend, 
  FieldSeparator, 
  FieldSet
} from '@/shadcn/field';

export const BulkSettingsField = () => {
  const { 
    canvas,
    applyBulk, 
    setApplyBulk, 
    bulkStrategy,
    setBulkStrategy,
    otherMatchingCanvases, 
    otherMatchingWithSize 
  } = useBulkSettings();

  const matchingCount = otherMatchingCanvases.length;
  const withSizeCount = otherMatchingWithSize.length;

  return otherMatchingCanvases.length > 0 ? (
    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2.5 p-2.5 border rounded-md">
      <Checkbox
        id="bulk-apply"
        className="data-checked:bg-foreground data-checked:border-foreground"
        checked={applyBulk}
        onCheckedChange={setApplyBulk} 
        aria-describedby="bulk-apply-hint" />

      <div className="flex flex-col">
        <FieldLabel htmlFor="bulk-apply" className="font-normal">
          Also apply to {matchingCount} other {matchingCount === 1 ? 'canvas' : 'canvases'}
        </FieldLabel>

        <FieldDescription className="text-xs">
          {matchingCount === 1 ? 'This canvas has' : 'These canvases have'} the same pixel 
          size ({canvas.width} × {canvas.height} px).
          Select to apply the same physical size to {matchingCount === 1 ? 'it.' : 'each of them.'}
        </FieldDescription>

        {applyBulk && withSizeCount > 0 && (
          <>
            <FieldSeparator className="mt-1" />

            <FieldSet className="space-y-2 mt-2.5">
              <FieldLegend 
                variant="label" 
                className="data-[variant=label]:text-xs text-muted-foreground font-normal px-0.5">
                {withSizeCount === 1 ? 'The canvas' : `${withSizeCount} of them`} already {withSizeCount === 1 ? 'has' : 'have'} a physical size:
              </FieldLegend>

              <RadioGroup
                value={bulkStrategy} 
                onValueChange={setBulkStrategy}
                className="gap-1 px-0.5">
                <Field orientation="horizontal">
                  <RadioGroupItem 
                    value="keep" 
                    id="conflict-keep" 
                    className="mb-px size-3.5" />

                  <FieldLabel htmlFor="conflict-keep" className="font-normal">
                    Keep existing sizes
                  </FieldLabel>
                </Field>

                <Field orientation="horizontal">
                  <RadioGroupItem 
                    value="replace" 
                    id="conflict-replace" 
                    className="mb-px size-3.5" />

                  <FieldLabel htmlFor="conflict-replace" className="font-normal">
                    Replace existing sizes
                  </FieldLabel>
                </Field>
              </RadioGroup>
            </FieldSet>
          </>
        )}
      </div>
    </div>
  ) : null;

}