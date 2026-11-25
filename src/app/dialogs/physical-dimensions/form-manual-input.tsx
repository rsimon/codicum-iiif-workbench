import { IconRulerMeasure } from '@tabler/icons-react';
import { Button } from '@/shadcn/button';
import { Input } from '@/shadcn/input';
import { useBulkSettings } from './bulk-settings-context';
import { BulkSettingsField } from './bulk-settings-field';
import {
  Field, 
  FieldDescription, 
  FieldGroup, 
  FieldLabel, 
  FieldLegend, 
  FieldSet 
} from '@/shadcn/field';

interface FormManualInputProps {

  widthStr: string;

  heightStr: string;

  unit: string;

  isValid: boolean;

  onWidthChanged(width: string): void;

  onHeightChanged(height: string): void;

  onUnitChanged(unit: string): void;

  onToggleForm(): void;

  onApplyScale(): void;

}

export const FormManualInput = (props: FormManualInputProps) => {
  const { applyBulk, allMatchingCanvases } = useBulkSettings();

  return (
    <div className="space-y-6" key="form_input">
      <div className="space-y-3">
        <FieldSet className="gap-0.5 items-start">
          <FieldLegend variant="label">Physical size</FieldLegend>

          <FieldDescription className="pt-2 text-xs leading-relaxed">
            Enter the known physical measurements for the scanned image.
          </FieldDescription>

          <FieldGroup 
            className="flex flex-row gap-2 mt-2 items-center">
            <Field>
              <FieldLabel htmlFor="width" className="sr-only">
                Width
              </FieldLabel>
              <Input
                id="width"
                placeholder="–"
                className="tabular-nums grow h-8" 
                value={props.widthStr} 
                onChange={e => props.onWidthChanged(e.target.value)} />
            </Field>
              
            <span className="text-muted-foreground">×</span>

            <Field className="pr-2">
              <FieldLabel htmlFor="height" className="sr-only">
                Height
              </FieldLabel>
              <Input
                id="height"
                placeholder="–"
                className="tabular-nums grow h-8" 
                value={props.heightStr} 
                onChange={e => props.onHeightChanged(e.target.value)} />
            </Field>

            <Field>
              <FieldLabel htmlFor="unit" className="sr-only">
                Unit
              </FieldLabel>
              <Input
                id="unit"
                placeholder="e.g. mm"
                className="tabular-nums shrink-0 h-8" 
                value={props.unit}
                onChange={e => props.onUnitChanged(e.target.value)} />
            </Field>
          </FieldGroup>
        </FieldSet>

        <BulkSettingsField />
      </div>

      <div className="flex gap-2 justify-between items-end">
        <Button 
          disabled={!props.isValid}
          onClick={props.onApplyScale}
          size="sm"
          className="bg-black hover:bg-black/80">
          {applyBulk ? (
            <>Apply to {allMatchingCanvases.length} canvases</>
          ) : (
            <>Apply scale</>
          )}
        </Button>

        <Button
          variant="link"
          size="sm"
          className="font-normal rounded-sm text-primary hover:text-primary px-1 h-auto"
          onClick={props.onToggleForm}>
          <IconRulerMeasure className="size-4" /> Measure from image
        </Button>
      </div>
    </div>
  )

}