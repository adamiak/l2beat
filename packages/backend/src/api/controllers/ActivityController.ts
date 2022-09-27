import { ApiActivity, ProjectId, UnixTime } from '@l2beat/types'

import { Config } from '../../config'
import { RpcTransactionCountRepository } from '../../peripherals/database/RpcTransactionCountRepository'
import { StarkexTransactionCountRepository } from '../../peripherals/database/StarkexTransactionCountRepository'

type ProjectsCounts = {
  projectId: ProjectId
  counts: { timestamp: UnixTime; count: number }[]
}[]

type TransactionApiProjects = Pick<
  Config['projects'][number],
  'projectId' | 'transactionApi'
>[]

export class ActivityController {
  constructor(
    private projects: TransactionApiProjects,
    private rpcRepository: RpcTransactionCountRepository,
    private starkexRepository: StarkexTransactionCountRepository,
  ) {}

  async getTransactionActivity(): Promise<ApiActivity> {
    const projectsCounts = await this.getProjectsCounts()

    return {
      combined: this.toCombinedActivity(projectsCounts),
      projects: this.toProjectsActivity(projectsCounts),
    }
  }

  private async getProjectsCounts(): Promise<ProjectsCounts> {
    const projectPromises = this.projects
      .filter((p) => !!p.transactionApi)
      .map(async (p) => {
        const repository =
          p.transactionApi?.type === 'rpc'
            ? this.rpcRepository
            : this.starkexRepository
        return {
          projectId: p.projectId,
          counts: await repository.getDailyTransactionCount(p.projectId),
        }
      })
    return Promise.all(projectPromises)
  }

  private toCombinedActivity(
    projectsCounts: ProjectsCounts,
  ): ApiActivity['combined'] {
    return {
      types: ['timestamp', 'daily tx count'],
      data: projectsCounts
        .map((p) => p.counts)
        .flat()
        .sort((a, b) => +a.timestamp - +b.timestamp)
        .reduce<ApiActivity['combined']['data']>(
          (acc, { count, timestamp }) => {
            const current = acc.at(-1)
            if (!current?.[0].equals(timestamp)) {
              acc.push([timestamp, count])
            } else {
              current[1] = current[1] + count
            }
            return acc
          },
          [],
        ),
    }
  }

  private toProjectsActivity(
    projectsCounts: ProjectsCounts,
  ): Record<
    string,
    { data: [UnixTime, number][]; types: ['timestamp', 'daily tx count'] }
  > {
    return projectsCounts.reduce<ApiActivity['projects']>(
      (acc, { projectId, counts }) => {
        acc[projectId.toString()] = {
          types: ['timestamp', 'daily tx count'],
          data: counts.map((c) => [c.timestamp, c.count]),
        }
        return acc
      },
      {},
    )
  }
}
