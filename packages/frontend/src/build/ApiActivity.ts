import { HttpClient } from '@l2beat/common'
import { ApiActivity, UnixTime } from '@l2beat/types'

export async function getApiActivity(apiUrl: string): Promise<ApiActivity> {
  const url = apiUrl + '/api/activity'

  const http = new HttpClient()
  const response = await http.fetch(url)
  if (!response.ok) {
    return getMockData()
  }
  const json: unknown = await response.json()
  const data = ApiActivity.parse(json)

  return data
}

const getMockData = (): ApiActivity => {
  const data: [UnixTime, number][] = []

  const HOW_MANY_DAYS = 14
  const START = UnixTime.now().toStartOf('day').add(-HOW_MANY_DAYS, 'days')

  for (let i = 0; i < HOW_MANY_DAYS; i++) {
    data.push([START.add(i, 'days'), 100_000 + i * 10_000])
  }

  const arbitrumData: [UnixTime, number][] = data.map((d) => [d[0], d[1] * 0.6])
  const optimismData: [UnixTime, number][] = data.map((d) => [d[0], d[1] * 0.3])
  const dydxData: [UnixTime, number][] = data.map((d) => [d[0], d[1] * 0.1])

  return {
    combined: {
      types: ['timestamp', 'daily tx count'] as ['timestamp', 'daily tx count'],
      data: data,
    },
    projects: {
      arbitrum: {
        types: ['timestamp', 'daily tx count'] as [
          'timestamp',
          'daily tx count',
        ],
        data: arbitrumData,
      },
      optimism: {
        types: ['timestamp', 'daily tx count'] as [
          'timestamp',
          'daily tx count',
        ],
        data: optimismData,
      },
      dydx: {
        types: ['timestamp', 'daily tx count'] as [
          'timestamp',
          'daily tx count',
        ],
        data: dydxData,
      },
    },
  }
}
