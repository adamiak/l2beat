import { Logger, mock } from '@l2beat/common'
import { UnixTime } from '@l2beat/types'
import { expect, mockFn } from 'earljs'
import waitForExpect from 'wait-for-expect'

import { Clock } from '../../../src/core/Clock'
import { ZksyncTransactionUpdater } from '../../../src/core/transaction-count/ZksyncTransactionUpdater'
import { ZksyncTransactionsRepository } from '../../../src/peripherals/database/ZksyncTransactionsRepository'
import { ZksyncClient } from '../../../src/peripherals/zksync'

describe(ZksyncTransactionUpdater.name, () => {
  describe(ZksyncTransactionUpdater.prototype.start.name, () => {
    it('skips known blocks', async () => {
      const zksyncClient = mock<ZksyncClient>({
        getLatestBlock: async () => 5,
        getTransactionsInBlock: async () => [],
      })
      const zksyncTransactionRepository = mock<ZksyncTransactionsRepository>({
        getMissingRanges: async () => [
          [-Infinity, -1],
          [2, 3],
          [5, Infinity],
        ],
        addMany: async () => 0,
      })
      const clock = mock<Clock>({
        onNewHour: (callback) => {
          callback(UnixTime.now())
          return () => {}
        },
      })
      const zksyncTransactionUpdater = new ZksyncTransactionUpdater(
        zksyncClient,
        zksyncTransactionRepository,
        clock,
        Logger.SILENT,
      )
      zksyncTransactionUpdater.start()

      await waitForExpect(() => {
        expect(zksyncClient.getTransactionsInBlock).toHaveBeenCalledExactlyWith(
          [[2], [5]],
        )
      })
    })
  })

  describe(ZksyncTransactionUpdater.prototype.update.name, () => {
    it('does not query the same blocks multiple times', async () => {
      const zksyncClient = mock<ZksyncClient>({
        getTransactionsInBlock: async () => [],
        getLatestBlock: async () => 5,
      })
      const zksyncTransactionsRepository = mock<ZksyncTransactionsRepository>({
        getMissingRanges: async () => [
          [-Infinity, -1],
          [2, 3],
          [5, Infinity],
        ],
        addMany: async () => 0,
      })
      const clock = mock<Clock>({
        onNewHour: (callback) => {
          callback(UnixTime.now())
          return () => {}
        },
      })
      const zksyncTransactionUpdater = new ZksyncTransactionUpdater(
        zksyncClient,
        zksyncTransactionsRepository,
        clock,
        Logger.SILENT,
      )
      await zksyncTransactionUpdater.update()
      await zksyncTransactionUpdater.update()

      await waitForExpect(() => {
        expect(zksyncClient.getTransactionsInBlock).toHaveBeenCalledExactlyWith(
          [[2], [5]],
        )
      })
    })
  })

  describe(ZksyncTransactionUpdater.prototype.updateBlock.name, () => {
    it('downloads and saves transactions to DB', async () => {
      const transactions1 = [{ blockIndex: 0, createdAt: new UnixTime(0) }]
      const transactions2 = [
        { blockIndex: 1, createdAt: new UnixTime(2) },
        { blockIndex: 0, createdAt: new UnixTime(1) },
      ]
      const zksyncClient = mock<ZksyncClient>({
        getTransactionsInBlock: mockFn()
          .resolvesToOnce(transactions1)
          .resolvesToOnce(transactions2),
      })
      const zksyncTransactionsRepository = mock<ZksyncTransactionsRepository>({
        addMany: async () => 0,
      })
      const clock = mock<Clock>()
      const zksyncTransactionUpdater = new ZksyncTransactionUpdater(
        zksyncClient,
        zksyncTransactionsRepository,
        clock,
        Logger.SILENT,
      )

      await zksyncTransactionUpdater.updateBlock(1)
      await zksyncTransactionUpdater.updateBlock(2)

      expect(zksyncTransactionsRepository.addMany).toHaveBeenCalledExactlyWith([
        [
          transactions1.map((transaction) => ({
            blockIndex: transaction.blockIndex,
            blockNumber: 1,
            timestamp: transaction.createdAt,
          })),
        ],
        [
          transactions2.map((transaction) => ({
            blockIndex: transaction.blockIndex,
            blockNumber: 2,
            timestamp: transaction.createdAt,
          })),
        ],
      ])
    })
  })
})
