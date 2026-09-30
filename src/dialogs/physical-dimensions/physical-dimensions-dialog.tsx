import { useEffect, useState, type ChangeEvent, type ReactElement } from 'react';
import { IconForms, IconRulerMeasure } from '@tabler/icons-react';
import { Input } from '@/shadcn/input';
import { Button } from '@/shadcn/button';
import { parseNumber } from '@/store/app-store-utils';
import type { PhysicalSize } from '@/types';
import { useMeasurement } from './measurement-context';
import { 
  FloatingPanel, 
  FloatingPanelContent, 
  FloatingPanelTrigger 
} from '@/components/floating-panel';
import { 
  Field, 
  FieldContent, 
  FieldDescription, 
  FieldGroup, 
  FieldLabel, 
  FieldLegend, 
  FieldSet 
} from '@/shadcn/field';

interface PhysicalDimensionsDialogProps {
  
  children: ReactElement;

  open: boolean;

  canvasLabel: string;

  canvasWidth: number;

  canvasHeight: number;
  
  physicalSize?: PhysicalSize;

  onOpenChange(open: boolean): void;

  onSizeChanged(size?: PhysicalSize): void;
  
}

type PhysicalDimensionsDialogMode = 'FORM_INPUT' | 'MEASURE';

export const PhysicalDimensionsDialog = (props: PhysicalDimensionsDialogProps) => {
  const [mode, setMode] = useState<PhysicalDimensionsDialogMode>('FORM_INPUT');

  const [widthStr, setWidthStr] = useState('');
  const [heightStr, setHeightStr] = useState('');

  const [distStr, setDistStr] = useState('');

  const [unit, setUnit] = useState('');

  const width = parseNumber(widthStr);
  const height = parseNumber(heightStr);

  const isValid = width !== undefined && height !== undefined && unit.trim();

  const { setEnableTapeMeasure, tapeMeasureState } = useMeasurement();

  const measuredDistance = tapeMeasureState.phase !== 'idle' ? tapeMeasureState.distancePx : 0;

  useEffect(() => {
    setMode('FORM_INPUT');
    setEnableTapeMeasure(false);

    if (!props.open || !props.physicalSize) {
      setWidthStr('');
      setHeightStr('');
      setDistStr('');
    } else {
      setWidthStr(props.physicalSize.width.toString());
      setHeightStr(props.physicalSize.height.toString());
      setUnit(props.physicalSize.unit);
    }
  }, [props.canvasLabel, props.open, props.physicalSize]);

  useEffect(() => {
    setEnableTapeMeasure(mode === 'MEASURE');
    if (mode === 'MEASURE') {
      setWidthStr('');
      setHeightStr('');
      setDistStr('');
    } else {
      setWidthStr(props.physicalSize?.width.toString() || '');
      setHeightStr(props.physicalSize?.height.toString() || '');
    }
  }, [mode, props.physicalSize]);

  const onDistanceChanged = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setDistStr(value);

    const dist = parseNumber(value);
    if (dist !== undefined && tapeMeasureState.phase !== 'idle') {
      const physicalPerPixel = dist / measuredDistance;
      const physicalWidth = Math.round(100 * props.canvasWidth * physicalPerPixel) / 100;
      const physicalHeight = Math.round(100 * props.canvasHeight * physicalPerPixel) / 100;

      setWidthStr(physicalWidth.toString());
      setHeightStr(physicalHeight.toString());
    }
  }

  const onApplyScale = () => {
    if (!isValid) return;

    props.onSizeChanged({
      width,
      height,
      unit: unit.trim()
    });

    setEnableTapeMeasure(false);

    props.onOpenChange(false);
  }

  return (
    <FloatingPanel 
      open={props.open} 
      onOpenChange={props.onOpenChange}>
      <FloatingPanelTrigger render={props.children} />

      <FloatingPanelContent 
        title={(
          <span>
            <span>Physical dimensions</span> <span className="text-muted-foreground">[{props.canvasLabel}]</span>
          </span>
        )}
        align="center"
        sideOffset={14}
        className="w-sm">
        <div className="p-4 space-y-6">
          <Field className="gap-2">
            <FieldLabel className="text-sm">Image size</FieldLabel>

            <FieldContent>
              <p className="text-muted-foreground text-sm tabular-nums">
                {props.canvasWidth.toLocaleString()} × {props.canvasHeight.toLocaleString()} px
              </p>
            </FieldContent>
          </Field>

          {mode === 'FORM_INPUT' ? (
            <div className="space-y-6" key="form_input">
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
                      value={widthStr} 
                      onChange={e => setWidthStr(e.target.value)} />
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
                      value={heightStr} 
                      onChange={e => setHeightStr(e.target.value)} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="unit" className="sr-only">
                      Unit
                    </FieldLabel>
                    <Input
                      id="unit"
                      placeholder="e.g. mm"
                      className="tabular-nums shrink-0 h-8" 
                      value={unit}
                      onChange={e => setUnit(e.target.value)} />
                  </Field>
                </FieldGroup>
              </FieldSet>

              <div className="flex gap-2 justify-between items-end">
                <Button 
                  disabled={!isValid}
                  onClick={onApplyScale}
                  size="sm"
                  className="bg-black hover:bg-black/80">
                  Apply scale
                </Button>

                <Button
                  variant="link"
                  size="sm"
                  className="font-normal text-primary hover:text-primary px-0.5 h-auto"
                  onClick={() => setMode('MEASURE')}>
                  <IconRulerMeasure className="size-4" /> Measure from image
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6" key="measure">
              <FieldSet className="gap-0.5 items-start">
                <FieldLegend variant="label">Measured distance</FieldLegend>

                <FieldDescription className="py-1.5 text-xs leading-relaxed">
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
                      value={`${measuredDistance.toLocaleString()} px`} />
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
                      value={distStr}
                      onChange={onDistanceChanged} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="unit" className="sr-only">
                      Unit
                    </FieldLabel>
                    <Input
                      id="unit"
                      placeholder="Unit"
                      className="tabular-nums shrink-0 h-8" 
                      value={unit}
                      onChange={e => setUnit(e.target.value)} />
                  </Field>
                </FieldGroup>
              </FieldSet>

              <div className="flex gap-2 justify-between items-end">
                <Button 
                  disabled={!isValid}
                  onClick={onApplyScale}
                  size="sm"
                  className="bg-black hover:bg-black/80">
                  Apply scale
                </Button>

                <Button
                  variant="link"
                  size="sm"
                  className="font-normal px-0.5 h-auto"
                  onClick={() => setMode('FORM_INPUT')}>
                  <IconForms className="size-4" /> Enter manually
                </Button>
              </div>
            </div>
          )}
        </div>
      </FloatingPanelContent>
    </FloatingPanel>
  )
 
}