import { useCallback, useEffect, useRef } from 'react';
import { Spring, type Rect } from 'openseadragon';
import { useReconstructionStore } from '../../reconstruction-store';
import { useComposerStore } from '../composer-store';
import type { ComposerLayout, ComposerLayoutItem } from '../../reconstruction-types';
import { OSD_ANIMATION_TIME, OSD_SPRING_STIFFNESS } from '../composer';

interface UseCanvasOutlinesProps {

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

export const useCanvasOutlines = (props: UseCanvasOutlinesProps) => {
  const selection = useReconstructionStore(state => state.selection);
  const isUserEdit = useComposerStore(state => state.isUserEdit);

  const itemsById = useRef<Map<string, ComposerLayoutItem>>(new Map());

  const visibleIdsRef = useRef(props.visibleIds);
  const selectedIdsRef = useRef<Set<string>>(new Set());

  // One spring per reconstruction canvas
  const springsById = useRef<Map<string, ItemSprings>>(new Map());

  // Redraw when selection changes
  useEffect(() => {
    selectedIdsRef.current = new Set(selection.map(s => s.id));
    props.drawRef.current();
  }, [selection, props.drawRef]);

  // Redraw when visible IDs change
  useEffect(() => {
    visibleIdsRef.current = props.visibleIds;

    for (const [id, springs] of springsById.current) {
      const stillNeeded = props.visibleIds.has(id) ||
        !springs.x.isAtTargetValue() || !springs.y.isAtTargetValue() || !springs.height.isAtTargetValue();

      if (!stillNeeded) springsById.current.delete(id);
    }

    props.drawRef.current();
  }, [props.visibleIds, props.drawRef]);

  // Redraw when layout changes
  useEffect(() => {
    itemsById.current = new Map(props.layout.items.map(item => [item.reconstructionCanvasId, item]));

    for (const item of props.layout.items) {
      const springs = springsById.current.get(item.reconstructionCanvasId);
      if (!springs) continue;

      if (springs.x.target.value !== item.x) {
        if (isUserEdit) springs.x.resetTo(item.x);
        else springs.x.springTo(item.x);
      }

      if (springs.y.target.value !== item.y) {
        if (isUserEdit) springs.y.resetTo(item.y);
        else springs.y.springTo(item.y);
      }
      
      if (springs.height.target.value !== item.height) {
        if (isUserEdit) springs.height.resetTo(item.height);
        else springs.height.springTo(item.height);
      }
    }

    props.drawRef.current();
  }, [props.layout, props.drawRef, isUserEdit]);

  return useCallback((
    bg: CanvasRenderingContext2D,
    fg: CanvasRenderingContext2D,
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

      bg.fillStyle = 'rgba(255, 255, 255, 1)';
      bg.fillRect(screenX, screenY, screenWidth, screenHeight);

      const isSelected = selectedIdsRef.current.has(canvasId);

      fg.strokeStyle = isSelected ? SELECTED_STROKE : DEFAULT_STROKE;
      fg.lineWidth = isSelected ? 2 : 1;
      fg.strokeRect(screenX, screenY, screenWidth, screenHeight);
    }
  }, []);
  
}
