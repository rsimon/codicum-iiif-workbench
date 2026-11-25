import { useEffect, useState, type ReactElement } from 'react';
import type { CozyCanvas } from 'cozy-iiif';
import { Field, FieldContent, FieldLabel } from '@/shadcn/field';
import { parseNumber } from '@/store/app-store-utils';
import type { PhysicalSize } from '@/types';
import { useMeasurement } from '../../measurement-tool';
import type { BulkConflictStrategy } from './bulk-settings';
import { FormManualInput } from './form-manual-input';
import { FormMeasureFromImage } from './form-measure-from-image';
import { 
  FloatingPanel, 
  FloatingPanelContent, 
  FloatingPanelTrigger 
} from '@/components/floating-panel';

interface PhysicalDimensionsDialogProps {
  
  children: ReactElement;

  open: boolean;

  canvas: CozyCanvas;
  
  physicalSize?: PhysicalSize;

  onOpenChange(open: boolean): void;

  onSizeChanged(size?: PhysicalSize): void;
  
}

type PhysicalDimensionsDialogMode = 'FORM_INPUT' | 'MEASURE';

// Shorthand
const round = (num: number) => Math.round(1000 * num) / 1000;

export const PhysicalDimensionsDialog = (props: PhysicalDimensionsDialogProps) => {
  const [mode, setMode] = useState<PhysicalDimensionsDialogMode>('FORM_INPUT');

  const [widthStr, setWidthStr] = useState('');
  const [heightStr, setHeightStr] = useState('');

  const [distStr, setDistStr] = useState('');

  const [unit, setUnit] = useState('');

  const width = parseNumber(widthStr);
  const height = parseNumber(heightStr);

  const aspectRatio = props.canvas.width / props.canvas.height;

  const isValid = width !== undefined && height !== undefined && unit.trim();

  const { setEnableTapeMeasure, tapeMeasureState } = useMeasurement();

  const measuredDistance = tapeMeasureState.phase !== 'idle' ? tapeMeasureState.distancePx : 0;

  const [applyBulk, setApplyBulk] = useState<number | null>(null);
  const [bulkStrategy, setBulkStrategy] = useState<BulkConflictStrategy>('keep');

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
  }, [props.open, props.physicalSize]);

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

  const onWidthChanged = (value: string) => {
    setWidthStr(value);

    const physicalWidth = parseNumber(value);
    if (physicalWidth)
      setHeightStr(round(physicalWidth / aspectRatio).toString());
  }

  const onHeightChanged = (value: string) => {
    setHeightStr(value);

    const physicalHeight = parseNumber(value);
    if (physicalHeight)
      setWidthStr(round(physicalHeight * aspectRatio).toString());
  }

  const onDistanceChanged = (distStr: string) => {
    setDistStr(distStr);

    const dist = parseNumber(distStr);
    if (dist !== undefined && tapeMeasureState.phase !== 'idle') {
      const physicalPerPixel = dist / measuredDistance;

      const physicalWidth = round(props.canvas.width * physicalPerPixel);
      const physicalHeight = round(props.canvas.height * physicalPerPixel);

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
            <span>Physical dimensions</span> <span className="text-muted-foreground">[{props.canvas.getLabel()}]</span>
          </span>
        )}
        align="center"
        sideOffset={38}
        className="w-sm">
        <div className="p-4 space-y-4">
          <Field className="gap-2">
            <FieldLabel className="text-sm">Image size</FieldLabel>

            <FieldContent>
              <p className="text-muted-foreground text-sm tabular-nums">
                {props.canvas.width.toLocaleString()} × {props.canvas.height.toLocaleString()} px
              </p>
            </FieldContent>
          </Field>

          {mode === 'FORM_INPUT' ? (
            <FormManualInput 
              canvas={props.canvas}
              widthStr={widthStr}
              heightStr={heightStr}
              unit={unit}
              isValid={Boolean(isValid)}
              applyBulk={applyBulk}
              bulkConflictStrategy={bulkStrategy}
              onWidthChanged={onWidthChanged}
              onHeightChanged={onHeightChanged}
              onUnitChanged={setUnit}
              onApplyBulkChanged={setApplyBulk}
              onBulkConflictStrategyChanged={setBulkStrategy}
              onToggleForm={() => setMode('MEASURE')}
              onApplyScale={onApplyScale} />
          ) : (
            <FormMeasureFromImage 
              canvas={props.canvas}
              measuredDistance={measuredDistance}
              distStr={distStr} 
              unit={unit} 
              isValid={Boolean(isValid)} 
              applyBulk={applyBulk}
              bulkConflictStrategy={bulkStrategy}
              onDistanceChanged={onDistanceChanged} 
              onUnitChanged={setUnit} 
              onApplyBulkChanged={setApplyBulk}
              onBulkConflictStrategyChanged={setBulkStrategy}
              onToggleForm={() => setMode('FORM_INPUT')} 
              onApplyScale={onApplyScale} />
          )}
        </div> 
      </FloatingPanelContent>
    </FloatingPanel>
  )
 
}