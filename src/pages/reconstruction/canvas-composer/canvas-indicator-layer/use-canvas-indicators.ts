import { useCallback, useEffect, useRef } from 'react';
import { Spring, type Rect } from 'openseadragon';
import { useReconstructionStore } from '../../reconstruction-store';
import type { ComposerLayout, ComposerLayoutItem } from '../../reconstruction-types';
import { OSD_ANIMATION_TIME, OSD_SPRING_STIFFNESS } from '../composer';

interface UseCanvasIndicatorsProps {

  layout: ComposerLayout;

  visibleIds: Set<string>;

  drawRef: { current: () => void };

}

interface ItemSprings {

  x: Spring;

  y: Spring;

  height: Spring;

}

const SELECTED_STROKE = 'oklch(0.5 0.15 246.78)'; // primary
const DEFAULT_STROKE = 'oklch(92.2% 0 0)'; // neutral-200

const createSprings = (item: ComposerLayoutItem): ItemSprings => {
  const options = { springStiffness: OSD_SPRING_STIFFNESS, animationTime: OSD_ANIMATION_TIME };
  return {
    x: new Spring({ ...options, initial: item.x }),
    y: new Spring({ ...options, initial: item.y }),
    height: new Spring({ ...options, initial: item.height })
  };
}

export const useCanvasIndicators = (props: UseCanvasIndicatorsProps) => {
  const springsById = useRef<Map<string, ItemSprings>>(new Map());
  const itemsById = useRef<Map<string, ComposerLayoutItem>>(new Map());
  const visibleIdsRef = useRef(props.visibleIds);
  const selectedIdsRef = useRef<Set<string>>(new Set());

  const selection = useReconstructionStore(state => state.selection);

  useEffect(() => {
    selectedIdsRef.current = new Set(selection.map(s => s.id));
    props.drawRef.current();
  }, [selection, props.drawRef]);

  useEffect(() => {
    visibleIdsRef.current = props.visibleIds;

    for (const [id, springs] of springsById.current) {
      const stillNeeded = props.visibleIds.has(id) ||
        !springs.x.isAtTargetValue() || !springs.y.isAtTargetValue() || !springs.height.isAtTargetValue();

      if (!stillNeeded) springsById.current.delete(id);
    }

    props.drawRef.current();
  }, [props.visibleIds, props.drawRef]);

  useEffect(() => {
    itemsById.current = new Map(props.layout.items.map(item => [item.reconstructionCanvasId, item]));

    for (const item of props.layout.items) {
      const springs = springsById.current.get(item.reconstructionCanvasId);
      if (!springs) continue;

      if (springs.x.target.value !== item.x) springs.x.springTo(item.x);
      if (springs.y.target.value !== item.y) springs.y.springTo(item.y);
      if (springs.height.target.value !== item.height) springs.height.springTo(item.height);
    }

    props.drawRef.current();
  }, [props.layout, props.drawRef]);

  return useCallback((
    backgroundContext: CanvasRenderingContext2D,
    foregroundContext: CanvasRenderingContext2D,
    bounds: Rect,
    scaleX: number,
    scaleY: number
  ) => {
    for (const canvasId of visibleIdsRef.current) {
      const item = itemsById.current.get(canvasId);
      if (!item) continue;

      let springs = springsById.current.get(canvasId);
      if (!springs) {
        springs = createSprings(item);
        springsById.current.set(canvasId, springs);
      }

      springs.x.update();
      springs.y.update();
      springs.height.update();

      const screenX = (springs.x.current.value - bounds.x) * scaleX;
      const screenY = (springs.y.current.value - bounds.y) * scaleY;
      const screenWidth = item.width * scaleX;
      const screenHeight = springs.height.current.value * scaleY;

      backgroundContext.fillStyle = 'rgba(255, 255, 255, 0.9)';
      backgroundContext.fillRect(screenX, screenY, screenWidth, screenHeight);

      const isSelected = selectedIdsRef.current.has(canvasId);

      foregroundContext.strokeStyle = isSelected ? SELECTED_STROKE : DEFAULT_STROKE;
      foregroundContext.lineWidth = isSelected ? 2 : 1;
      foregroundContext.strokeRect(screenX, screenY, screenWidth, screenHeight);
    }
  }, []);
}
