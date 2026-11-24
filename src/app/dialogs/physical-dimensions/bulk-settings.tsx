import type { CozyCanvas } from 'cozy-iiif';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet} from '@/shadcn/field';
import { useBulkSettings } from './use-bulk-settings';
import { Checkbox } from '@/shadcn/checkbox';
import { RadioGroup, RadioGroupItem } from '@/shadcn/radio-group';

export type BulkConflictStrategy = 'keep' | 'replace';

interface BulkSettingsProps {

  canvas: CozyCanvas;

  applyBulk: boolean;

  conflictStrategy: BulkConflictStrategy;

  onChangeApplyBulk(apply: boolean): void;

  onChangeConflictStrategy(conflict: BulkConflictStrategy): void;

}

export const BulkSettings = (props: BulkSettingsProps) => {
  const {matchingCanvases, matchingWithoutSize } = useBulkSettings(props.canvas);

  const matchingCount = matchingCanvases.length;
  const withSizeCount = matchingCount - matchingWithoutSize.length;

  return matchingCount > 0 ? (
    <FieldGroup>
      <Field>
        <Checkbox
          id="bulk-apply"
          checked={true}
          onCheckedChange={() => {}} />

        <FieldContent>
          <FieldLabel htmlFor="bulk-apply">
            Also apply to {matchingCount} other {matchingCount === 1 ? 'canvas' : 'canvases'}
          </FieldLabel>

          <FieldDescription>
            These canvases have the same pixel size (1.041 × 1.634 px).
            Select to apply the same physical size to each of them.
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