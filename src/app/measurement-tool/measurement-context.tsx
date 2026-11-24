import { createContext, useContext, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Point } from 'openseadragon';
import type { PhysicalSize } from '@/types';

export interface ActiveMeasureState {

  phase: 'dragging' | 'committed';

  start: Point;

  end: Point;

  distancePx: number;

}

export interface IdleMeasureState {

  phase: 'idle';

}

export type TapeMeasureState = ActiveMeasureState | IdleMeasureState;

export interface TapeMeasureOpts { 

  showLabel?: boolean;

  canvasSize?: PhysicalSize;

}

interface MeasurementContextValue {

  isTapeMeasureEnabled: boolean;

  setEnableTapeMeasure(enabled: boolean, opts?: TapeMeasureOpts): void;

  tapeMeasureOpts: TapeMeasureOpts;

  setTapeMeasureOpts(opts?: TapeMeasureOpts): void;

  tapeMeasureState: TapeMeasureState;

  setTapeMeasureState: Dispatch<SetStateAction<TapeMeasureState>>;

}

const MeasurementContext = createContext<MeasurementContextValue | undefined>(undefined);

export const MeasurementProvider = ({ children }: { children: React.ReactNode }) => {
  const [tapeMeasureState, setTapeMeasureState] = useState<TapeMeasureState>({ phase: 'idle'});

  const [tapeMeasureOpts, _setTapeMeasureOpts] = useState<TapeMeasureOpts>({});

  const [isTapeMeasureEnabled, setIsTapeMeasureEnabled] = useState(false);
  
  // Shorthand
  const setEnableTapeMeasure = (enabled: boolean, opts: TapeMeasureOpts= {}) => {
    setIsTapeMeasureEnabled(enabled);
    if (enabled) 
      _setTapeMeasureOpts(opts);
    else 
      _setTapeMeasureOpts({});
  }

  // For convenience
  const setTapeMeasureOpts = (opts: TapeMeasureOpts = {}) => _setTapeMeasureOpts(opts);

  return (
    <MeasurementContext.Provider 
      value={{ 
        isTapeMeasureEnabled,
        setEnableTapeMeasure,
        tapeMeasureOpts,
        setTapeMeasureOpts,
        tapeMeasureState, 
        setTapeMeasureState 
      }}>
      {children}
    </MeasurementContext.Provider>
  )

}

export const useMeasurement = () => {
  const ctx = useContext(MeasurementContext);
  if (!ctx) throw new Error('useMeasurement must be used within a MeasurementProvider');
  return ctx;
}