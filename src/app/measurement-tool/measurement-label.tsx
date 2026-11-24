import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Viewer } from 'openseadragon';

interface MeasurementLabelProps {

  x: number;

  y: number;

  text: string;

  viewer: Viewer;

}

export const MeasurementLabel = (props: MeasurementLabelProps) => {
  const { viewer, text, x, y } = props;

  const textRef = useRef<SVGTextElement>(null);

  const [box, setBox] = useState<{ width: number; height: number, r: number } | null>(null);

  const measure = useCallback(() => {
    if (!textRef.current || !viewer) return;

    const scale = viewer.viewport.getZoom(true) * viewer.container.clientWidth;
    if (scale === 0) return;

    const fontSize = 14 / scale;
    textRef.current.setAttribute('font-size', `${fontSize}px`);

    const { width, height } = textRef.current.getBBox();

    setBox({ 
      width: width + 12 / scale, 
      height: height + 8 / scale, 
      r: 4 / scale 
    });
  }, [viewer, text]);
  
  useEffect(() => {
    if (!viewer || !textRef.current) return;
  
    viewer.addHandler('update-viewport', measure);

    return () => {
      viewer.removeHandler('update-viewport', measure);
    };
  }, [viewer, measure]);

  useLayoutEffect(() => measure(), [text]);

  return (
    <g>
      {box && (
        <rect
          x={x - box.width / 2}
          y={y - box.height / 2}
          width={box.width}
          height={box.height}
          rx={box.r}
          fill="#fff" 
          stroke="oklch(75% 0.35 328)" 
          strokeWidth={2} 
          vectorEffect="non-scaling-stroke" />
      )}

      <text
        ref={textRef}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily=""
        fontWeight={500}
        fill="oklch(75% 0.35 328)">
        {text}
      </text>
    </g>
  )

}