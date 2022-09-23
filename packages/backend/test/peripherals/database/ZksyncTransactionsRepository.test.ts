import { Logger } from '@l2beat/common'
import { UnixTime } from '@l2beat/types'
import { expect } from 'earljs'

import {
  ZksyncTransactionRecord,
  ZksyncTransactionsRepository,
} from '../../../src/peripherals/database/ZksyncTransactionsRepository'
import { setupDatabaseTestSuite } from './shared/setup'

describe(ZksyncTransactionsRepository.name, () => {
  const { database } = setupDatabaseTestSuite()
  const repository = new ZksyncTransactionsRepository(database, Logger.SILENT)

  beforeEach(async () => {
    await repository.deleteAll()
  })

  describe(ZksyncTransactionsRepository.prototype.getAll.name, () => {
    it('gets one record', async () => {
      const record = fakeRecord()
      await repository.add(record)

      expect(await repository.getAll()).toEqual([record])
    })

    it('gets multiple records', async () => {
      const records = [fakeRecord(), fakeRecord(), fakeRecord()]
      await repository.addMany(records)

      expect(await repository.getAll()).toBeAnArrayWith(...records)
    })
  })

  describe(ZksyncTransactionsRepository.prototype.getMissingRanges.name, () => {
    it('works with an empty repository', async () => {
      expect(await repository.getMissingRanges()).toEqual([
        [-Infinity, Infinity],
      ])
    })

    it('finds holes', async () => {
      await repository.addMany([
        fakeRecord({ blockNumber: 0 }),
        fakeRecord({ blockNumber: 1 }),
        fakeRecord({ blockNumber: 6 }),
        fakeRecord({ blockNumber: 7 }),
        fakeRecord({ blockNumber: 10 }),
      ])

      expect(await repository.getMissingRanges()).toEqual([
        [-Infinity, 0],
        [2, 6],
        [8, 10],
        [11, Infinity],
      ])
    })

    it('finds holes when block 0 is missing', async () => {
      await repository.addMany([fakeRecord({ blockNumber: 1 })])

      expect(await repository.getMissingRanges()).toEqual([
        [-Infinity, 1],
        [2, Infinity],
      ])
    })

    it('finds holes on a big set', async () => {
      const numbers = Array.from({ length: 200 }, () =>
        Math.floor(Math.random() * 1000),
      ).filter((x, i, a) => a.indexOf(x) === i)

      await repository.addMany(
        numbers.map((number) => fakeRecord({ blockNumber: number })),
      )

      const ranges = await repository.getMissingRanges()

      const result = []
      for (const [start, end] of ranges) {
        for (let i = Math.max(start, 0); i < Math.min(end, 1000); i++) {
          result.push(i)
        }
      }

      const expected = []
      for (let i = 0; i < 1000; i++) {
        if (!numbers.includes(i)) {
          expected.push(i)
        }
      }

      expect(result.sort()).toEqual(expected.sort())
    })
  })
})

function fakeRecord(
  record?: Partial<ZksyncTransactionRecord>,
): ZksyncTransactionRecord {
  return {
    blockNumber: Math.floor(Math.random() * 1000),
    blockIndex: Math.floor(Math.random() * 100),
    timestamp: new UnixTime(Math.floor(Math.random() * 10000)),
    ...record,
  }
}
