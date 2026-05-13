'use client'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { CHART_COLORS } from '../../lib/color-tokens'

/**
 * Mini línea sin ejes ni tooltips, pensada para meterse en cards KPI.
 * `data` puede tener cualquier shape; se accede por `dataKey`.
 */
export function Sparkline<T extends Record<string, unknown>>({
  data,
  dataKey,
  color = CHART_COLORS.primary,
  height = 36,
}: {
  data: T[]
  dataKey: keyof T & string
  color?: string
  height?: number
}) {
  if (data.length === 0) return <div style={{ height }} />
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
