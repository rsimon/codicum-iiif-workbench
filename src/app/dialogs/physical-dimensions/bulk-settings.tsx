import type { CozyCanvas } from 'cozy-iiif';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet} from '@/shadcn/field';
import { useBulkSettings } from './use-bulk-settings';
import { Checkbox } from '@/shadcn/checkbox';
import { RadioGroup, RadioGroupItem } from '@/shadcn/radio-group';

export type BulkConflictStrategy = 'keep' | 'replace';

interface BulkSettingsProps {

  canvas: CozyCanvas;

  applyBulk: number | null;

  conflictStrategy: BulkConflictStrategy;

  onChangeApplyBulk(apply: number | null): void;

  onChangeConflictStrategy(conflict: BulkConflictStrategy): void;

}

export const BulkSettings = (props: BulkSettingsProps) => {
  const {matchingCanvases, matchingWithoutSize } = useBulkSettings(props.canvas);

  const matchingCount = matchingCanvases.length;
  const withSizeCount = matchingCount - matchingWithoutSize.length;

  const onCheckedChange = (checked: boolean) => {
    if (checked)
      props.onChangeApplyBulk(matchingCount);
    else
      props.onChangeApplyBulk(null);
  }

  return matchingCount > 0 ? (
    <FieldGroup className="p-2.5 border rounded-md shadow-xs">
      <Field orientation="horizontal">
        <Checkbox
          id="bulk-apply"
          checked={Boolean(props.applyBulk)}
          onCheckedChange={onCheckedChange} />

        <FieldContent>
          <FieldLabel htmlFor="bulk-apply">
            Also apply to {matchingCount} other {matchingCount === 1 ? 'canvas' : 'canvases'}
          </FieldLabel>

          <FieldDescription className="text-xs">
            {matchingCount === 1 ? 'The canvas has' : 'The canvases have'} the same pixel 
            size ({props.canvas.width.toLocaleString()} × {props.canvas.height.toLocaleString()} px)
            Select to apply the same physical size to {matchingCount === 1 ? 'it.' : 'each of them.'}
          </FieldDescription>
        </FieldContent>
      </Field>

      {props.applyBulk && withSizeCount > 0 && (
        <>
          <FieldSeparator />

          <FieldSet>
            <FieldLegend variant="label">
              {withSizeCount} already {withSizeCount === 1 ? 'has' : 'have'} a physical size
            </FieldLegend>

            <RadioGroup 
              value={props.conflictStrategy} 
              onValueChange={props.onChangeConflictStrategy}>
              <Field orientation="horizontal">
                <RadioGroupItem value="keep" id="conflict-keep" />
                <FieldLabel htmlFor="conflict-keep" className="font-normal">
                  Keep existing sizes
                </FieldLabel>
              </Field>

              <Field orientation="horizontal">
                <RadioGroupItem value="replace" id="conflict-replace" />
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