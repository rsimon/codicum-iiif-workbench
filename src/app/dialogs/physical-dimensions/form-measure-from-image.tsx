import { IconForms } from '@tabler/icons-react';
import { Button } from '@/shadcn/button';
import { Input } from '@/shadcn/input';
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

  return (
    <div className="space-y-6" key="measure">
      <FieldSet className="gap-0.5 items-start space-y-1.5">
        <FieldLegend variant="label">Measured distance</FieldLegend>

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

        {/*othersWithSameSize > 0 && (
          <Field className="leading-relaxed block mt-1 border border-primary/20 rounded-md p-2 text-xs text-primary flex-row bg-accent">
            There is <strong className="font-semibold">{othersWithSameSize} other canvas</strong> with identical pixel 
            size of <span className="whitespace-nowrap">{props.canvas.width.toLocaleString()} × {props.canvas.height.toLocaleString()} px</span>.

            <div className="mt-2">
              <Label className="text-xs font-normal">
                <Checkbox
                  checked={true}
                  onCheckedChange={() => {}} />
                Apply same physical size to all
              </Label>
            </div>
          </Field>  
        ) */}
      </FieldSet>

      <div className="flex gap-2 justify-between items-end">
        <Button 
          disabled={!props.isValid}
          onClick={props.onApplyScale}
          size="sm"
          className="bg-black hover:bg-black/80">
          Apply scale
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