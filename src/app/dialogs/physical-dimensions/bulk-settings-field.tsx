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
    <FieldGroup className="p-2.5 border rounded-md gap-2.5">
      <Field orientation="horizontal">
        <Checkbox
          id="bulk-apply"
          className="data-checked:bg-foreground data-checked:border-foreground"
          checked={applyBulk}
          onCheckedChange={setApplyBulk} />

        <FieldContent className="gap-0 mt-px">
          <FieldLabel htmlFor="bulk-apply" className="font-normal">
            Also apply to {matchingCount} other {matchingCount === 1 ? 'canvas' : 'canvases'}
          </FieldLabel>

          <FieldDescription className="text-xs">
            {matchingCount === 1 ? 'This canvas has' : 'These canvases have'} the same pixel 
            size ({canvas.width.toLocaleString()} × {canvas.height.toLocaleString()} px).
            Select to apply the same physical size to {matchingCount === 1 ? 'it.' : 'each of them.'}
          </FieldDescription>
        </FieldContent>
      </Field>

      {applyBulk && withSizeCount > 0 && (
        <>
          <FieldSeparator />

          <FieldSet className="space-y-2.5">
            <FieldLegend 
              variant="label" 
              className="data-[variant=label]:text-xs text-muted-foreground font-normal px-0.5">
              {withSizeCount} canvas{withSizeCount === 1 ? '' : 'es'} already {withSizeCount === 1 ? 'has' : 'have'} a physical size:
            </FieldLegend>

            <RadioGroup
              value={bulkStrategy} 
              onValueChange={setBulkStrategy}
              className="gap-1">
              <Field orientation="horizontal">
                <RadioGroupItem 
                  value="keep" 
                  id="conflict-keep" 
                  className="mb-px" />

                <FieldLabel htmlFor="conflict-keep" className="font-normal">
                  Keep existing sizes
                </FieldLabel>
              </Field>

              <Field orientation="horizontal">
                <RadioGroupItem 
                  value="replace" 
                  id="conflict-replace" 
                  className="mb-px" />

                <FieldLabel htmlFor="conflict-replace" className="font-normal">
                  Replace existing sizes
                </FieldLabel>
              </Field>
            </RadioGroup>
          </FieldSet>
        </>
      )}
    </FieldGroup>
  ) : null;

}