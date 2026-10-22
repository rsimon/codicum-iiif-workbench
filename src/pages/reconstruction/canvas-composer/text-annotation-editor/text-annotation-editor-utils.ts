const EDGE_HANDLE_SIZE = 8; // screen px, centered on the border

export const counterScale = (px: number) => `calc(${px}px / var(--osd-scale, 1))`;

export const EDGE_HANDLES = {
  top:    { top: counterScale(-EDGE_HANDLE_SIZE / 2), left: counterScale(-EDGE_HANDLE_SIZE / 2), right: counterScale(-EDGE_HANDLE_SIZE / 2), height: counterScale(EDGE_HANDLE_SIZE) },
  bottom: { bottom: counterScale(-EDGE_HANDLE_SIZE / 2), left: counterScale(-EDGE_HANDLE_SIZE / 2), right: counterScale(-EDGE_HANDLE_SIZE / 2), height: counterScale(EDGE_HANDLE_SIZE) },
  left:   { left: counterScale(-EDGE_HANDLE_SIZE / 2), top: 0, bottom: 0, width: counterScale(EDGE_HANDLE_SIZE) },
  right:  { right: counterScale(-EDGE_HANDLE_SIZE / 2), top: 0, bottom: 0, width: counterScale(EDGE_HANDLE_SIZE) }
};