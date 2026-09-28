import {
  ArcElement, BarElement, CategoryScale, Chart, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip,
  type ChartOptions,
} from 'chart.js'
import type { Tokens } from './theme'

Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)
Chart.defaults.font.family = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
Chart.defaults.font.size = 12

/** Shared, recessive chart chrome: hairline solid grid, muted ticks, surface-coloured tooltips. */
export function baseOptions(t: Tokens, opts: { horizontal?: boolean; legend?: boolean; stacked?: boolean } = {}): ChartOptions<'bar'> {
  const valueAxis = opts.horizontal ? 'x' : 'y'
  const catAxis = opts.horizontal ? 'y' : 'x'
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: opts.horizontal ? 'y' : 'x',
    animation: { duration: 250 },
    plugins: {
      legend: {
        display: !!opts.legend, position: 'top', align: 'start',
        labels: { color: t.text2, boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 2, padding: 14 },
      },
      tooltip: {
        backgroundColor: t.surface, titleColor: t.text, bodyColor: t.text2, borderColor: t.border, borderWidth: 1,
        padding: 10, cornerRadius: 8, boxPadding: 4, usePointStyle: true,
      },
    },
    scales: {
      [valueAxis]: {
        stacked: opts.stacked, beginAtZero: true, border: { display: false },
        grid: { color: t.grid, lineWidth: 1 }, ticks: { color: t.muted, maxTicksLimit: 6 },
      },
      [catAxis]: {
        stacked: opts.stacked, border: { color: t.border }, grid: { display: false }, ticks: { color: t.text2 },
      },
    },
  }
}

/** Rounded data-end, anchored to the baseline; 2px surface gap between adjacent bars. */
export const barStyle = (t: Tokens) => ({
  borderRadius: 4, borderSkipped: 'start' as const, borderWidth: 0, maxBarThickness: 28,
  categoryPercentage: 0.8, barPercentage: 0.9, hoverBorderColor: t.surface,
})
