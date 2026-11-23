import type { PhysicalSize } from "@/types";
import type { Point, Viewer } from "openseadragon";

export const formatNumber = (n: number): string => {
  if (!Number.isFinite(n)) return '';
  return String(Math.round(n * 100) / 100);
}

export const getDistance = (start: Point, end: Point, viewer: Viewer) => {
  const startPx = viewer.viewport.viewportToImageCoordinates(start);
  const endPx = viewer.viewport.viewportToImageCoordinates(end);

  const dx = Math.abs(endPx.x - startPx.x);
  const dy = Math.abs(endPx.y - startPx.y);

  return Math.ceil(10 * Math.sqrt(dx * dx + dy * dy)) / 10;
}

const INCH_ALIASES = ['in', 'in.', 'inch', '"', '″', '”', '“'];

export const getPPI = (physical: PhysicalSize, pixel: { width: number, height: number }) => {
  const unit = physical.unit.toLowerCase().trim();

  const inch = 
    unit === 'm' ? physical.width / 0.0254 :
    unit === 'cm' ? physical.width / 2.54 :
    unit === 'mm' ? physical.width / 25.4 :
    INCH_ALIASES.includes(unit) ? physical.width : undefined;
    
  if (inch === undefined) return;

  return pixel.width / inch;
}