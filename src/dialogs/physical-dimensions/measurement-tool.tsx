import { useEffect, useMemo } from 'react';
import { Point } from 'openseadragon';
import type { CanvasClickEvent, Viewer } from 'openseadragon';
import type { PhysicalScale } from '@/types';
import { useMeasurement } from './measurement-context';
import { getDistance } from './measurement-utils';
import { MeasurementLabel } from './measurement-label';

interface MeasurementToolProps {

  viewer?: Viewer | null;

  physicalScale?: PhysicalScale;

}

export const MeasurementTool = (props: MeasurementToolProps) => {
  const { viewer } = props;

  const { 
    isTapeMeasureEnabled, 
    tapeMeasureOpts,
    tapeMeasureState, 
    setTapeMeasureState 
  } = useMeasurement();

  const physicalUnit = props.physicalScale?.unit ?? tapeMeasureOpts.canvasSize?.unit;

  const physicalUnitsPerOSDUnit =
    props.physicalScale?.physicalUnitsPerOSDUnit ?? tapeMeasureOpts.canvasSize?.width;
  
  const hasPhysicalScale = physicalUnit !== undefined && physicalUnitsPerOSDUnit !== undefined;

  const label = useMemo(() => {
    if (!tapeMeasureOpts.showLabel || tapeMeasureState.phase === 'idle') return;

    if (hasPhysicalScale) {
      const distance = Math.hypot(
        tapeMeasureState.end.x - tapeMeasureState.start.x,
        tapeMeasureState.end.y - tapeMeasureState.start.y
      ) * physicalUnitsPerOSDUnit;

      return `${Math.round(100 * distance) / 100} ${physicalUnit}`;
    }

    return `${tapeMeasureState.distancePx} px`;
  }, [
    hasPhysicalScale,
    physicalUnit,
    physicalUnitsPerOSDUnit,
    tapeMeasureOpts.showLabel,
    tapeMeasureState
  ]);

  useEffect(() => {
    if (!viewer || !isTapeMeasureEnabled) return;

    const onCanvasClick = (evt: CanvasClickEvent) => {
      if (!evt.quick) return;

      const pt = viewer.viewport.pointFromPixel(evt.position);

      setTapeMeasureState(m => {
        if (m.phase === 'idle' || m.phase === 'committed') {
          return { 
            phase: 'dragging', 
            start: pt, 
            end: pt, 
            distancePx: 0
          };
        } else { // m.phase === 'dragging'
          return { ...m, phase: 'committed' };
        }
      });
    }

    const onPointerMove = (evt: PointerEvent) => {
      const pt = viewer.viewport.pointFromPixel(new Point(evt.offsetX, evt.offsetY));

      setTapeMeasureState(m => m.phase === 'dragging' ? { 
        ...m, 
        end: pt, 
        distancePx: hasPhysicalScale ? 0 : getDistance(m.start, pt, viewer)
      } : m);
    }

    viewer.element.style.cursor = 'crosshair';

    viewer.addHandler('canvas-click', onCanvasClick);
    viewer.element.addEventListener('pointermove', onPointerMove);

    return () => {
      if (viewer.element) {
        viewer.element.style.cursor = '';
        viewer.element.removeEventListener('pointermove', onPointerMove);
      }

      viewer.removeHandler('canvas-click', onCanvasClick);

      setTapeMeasureState({ phase: 'idle' });
    };
  }, [viewer, isTapeMeasureEnabled, hasPhysicalScale]);

  return (viewer && isTapeMeasureEnabled && tapeMeasureState.phase !== 'idle') ? (
    <g pointerEvents="none">
      <defs>
        <marker
          id="measure-tick"
          markerWidth="1"
          markerHeight="6"
          refX="0.5"
          refY="3"
          markerUnits="strokeWidth"
          orient="auto">

          <line
            x1="0.5" y1="0"
            x2="0.5" y2="8"
            stroke="oklch(75% 0.35 328)"
            strokeWidth={1} />
        </marker>
      </defs>

      <line
        x1={tapeMeasureState.start.x} y1={tapeMeasureState.start.y}
        x2={tapeMeasureState.end.x}   y2={tapeMeasureState.end.y}
        stroke="oklch(75% 0.35 328)"
        strokeWidth={2.5}
        vectorEffect="non-scaling-stroke" 
        markerStart="url(#measure-tick)"
        markerEnd="url(#measure-tick)"  />

      {label && (
        <MeasurementLabel
          x={(tapeMeasureState.start.x + tapeMeasureState.end.x) / 2}
          y={(tapeMeasureState.start.y + tapeMeasureState.end.y) / 2}
          text={label}
          viewer={viewer}
        />
      )}
    </g>
  ) : null;

}