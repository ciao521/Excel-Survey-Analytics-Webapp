export interface ChartDataItem {
  response: string
  count: number
  percentage: number
}

export interface TooltipFormatter {
  (value: number, name: string): [number, string]
}

export interface LabelFormatter {
  (label: string): string
}
