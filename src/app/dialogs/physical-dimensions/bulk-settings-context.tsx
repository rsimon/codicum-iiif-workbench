import { createContext, useContext, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { CozyCanvas } from 'cozy-iiif';
import { useAppStore } from '@/store/app-store';

export type BulkConflictStrategy = 'keep' | 'replace';

interface BulkSettingsContextValue {

  canvas: CozyCanvas;

  applyBulk: boolean;

  setApplyBulk: Dispatch<SetStateAction<boolean>>;

  bulkStrategy: BulkConflictStrategy;

  setBulkStrategy: Dispatch<SetStateAction<BulkConflictStrategy>>;

  allMatchingCanvases: CozyCanvas[];

  otherMatchingCanvases: CozyCanvas[];

  otherMatchingWithSize: CozyCanvas[];

}

const BulkSettingsContext = createContext<BulkSettingsContextValue | undefined>(undefined);

export const BulkSettingsProvider = ({ canvas, children }: { canvas: CozyCanvas, children: React.ReactNode }) => {
  const sources = useAppStore(state => state.sources);
  const sizes = useAppStore(state => state.sizes);

  const [applyBulk, setApplyBulk] = useState(false);
  const [bulkStrategy, setBulkStrategy] = useState<BulkConflictStrategy>('keep');
   
  // All canvases with the given size, incl. this canvas
  const allMatchingCanvases = useMemo(() => (
    sources.flatMap(s => s.manifest.canvases)
  ), [sources, canvas.width, canvas.height, canvas.id]);

  // Just the other matching canvases, without this one
  const otherMatchingCanvases = useMemo(() => (
    allMatchingCanvases.filter(c => c.id !== canvas.id)
  ), [allMatchingCanvases, canvas.id]);

  // Other matching canvases that don't have a physical size set
  const otherMatchingWithSize = useMemo(() => {
    return otherMatchingCanvases.filter(c => sizes.has(c.id));
  }, [otherMatchingCanvases, sizes]);

  return (
    <BulkSettingsContext.Provider value={{
      canvas,
      applyBulk, 
      setApplyBulk,
      bulkStrategy,
      setBulkStrategy, 
      allMatchingCanvases, 
      otherMatchingCanvases, 
      otherMatchingWithSize
    }}>
      {children}
    </BulkSettingsContext.Provider>
  )
}

export const useBulkSettings = () => {
  const ctx = useContext(BulkSettingsContext);
  if (!ctx) throw new Error('useMeasurement must be used within a MeasurementProvider');
  return ctx;
}