import { IconForms } from '@tabler/icons-react';
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

interface FormMeasureFromImageProps {
    
  measuredDistance: number;
  
  distStr: string;

  unit: string;

  isValid: boolean;

  onDistanceChanged(dist: string): void;

  onUnitChanged(unit: string): void;

  onToggleForm(): void;

  onApplyScale(): void;

}

export const FormMeasureFromImage = (props: FormMeasureFromImageProps) => {
  const { applyBulk, canvasesToResize } = useBulkSettings();

  return (
    <div className="space-y-6" key="measure">
      <div className="space-y-3">
        <FieldSet className="gap-0.5 items-start space-y-1.5">
          <FieldLegend variant="label" className="font-normal">
            Measured distance
          </FieldLegend>

          <FieldDescription className="text-xs leading-relaxed">
            Click two points with a known distance apart to calibrate the physical size.
          </FieldDescription>

          <FieldGroup className="flex-row items-center gap-2 mt-2">
            <Field>
              <FieldLabel htmlFor="measured-px" className="sr-only">
                Measured pixels
              </FieldLabel>
              <Input
                readOnly 
                id="measured-px"
                className="bg-muted tabular-nums text-muted-foreground text-sm h-8"
                value={`${props.measuredDistance.toLocaleString()} px`} />
            </Field>

            <span className="text-muted-foreground">=</span>

            <Field className="pr-2">
              <FieldLabel htmlFor="measured-value" className="sr-only">
                Value
              </FieldLabel>
              <Input
                id="measured-value"
                placeholder="–"
                className="grow tabular-nums h-8" 
                value={props.distStr}
                onChange={e => props.onDistanceChanged(e.target.value)} />
            </Field>

            <Field>
              <FieldLabel htmlFor="unit" className="sr-only">
                Unit
              </FieldLabel>
              <Input
                id="unit"
                placeholder="Unit"
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
            <>Apply to {canvasesToResize.length} canvases</>
          ) : (
            <>Apply scale</>
          )}
        </Button>

        <Button
          variant="link"
          size="sm"
          className="font-normal px-0.5 h-auto"
          onClick={props.onToggleForm}>
          <IconForms className="size-4" /> Enter manually
        </Button>
      </div>
    </div>
  )

}