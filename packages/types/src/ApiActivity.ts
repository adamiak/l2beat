import z from 'zod'

import { branded } from './branded'
import { UnixTime } from './UnixTime'

const ActivityChartPoint = z.tuple([
  branded(z.number(), (n) => new UnixTime(n)),
  z.number().int(),
])
export type ActivityChartPoint = z.infer<typeof ActivityChartPoint>

const ActivityChart = z.object({
  types: z.tuple([z.literal('timestamp'), z.literal('daily tx count')]),
  data: z.array(ActivityChartPoint),
})
export type ActivityChart = z.infer<typeof ActivityChart>

export const ApiActivity = z.object({
  combined: ActivityChart,
  projects: z.record(z.string(), ActivityChart),
})
export type ApiActivity = z.infer<typeof ApiActivity>
