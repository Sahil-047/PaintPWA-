export const PAINT_SIZES = ['50ml', '100ml', '200ml', '500ml', '1L', '4L', '10L', '20L'] as const;
export type PaintSize = (typeof PAINT_SIZES)[number];

export function emptySizeMap(): Record<PaintSize, number> {
  return {
    '50ml': 0,
    '100ml': 0,
    '200ml': 0,
    '500ml': 0,
    '1L': 0,
    '4L': 0,
    '10L': 0,
    '20L': 0,
  };
}

export function sumSizeMap(map: Record<string, number> | undefined): number {
  if (!map) return 0;
  return PAINT_SIZES.reduce((sum, size) => sum + (map[size] ?? 0), 0);
}
