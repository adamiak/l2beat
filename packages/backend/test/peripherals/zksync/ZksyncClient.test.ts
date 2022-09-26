import { HttpClient, Logger, mock } from '@l2beat/common'
import { UnixTime } from '@l2beat/types'
import { expect, mockFn } from 'earljs'
import { Response } from 'node-fetch'

import { ZksyncClient } from '../../../src/peripherals/zksync'

describe(ZksyncClient.name, () => {
  describe(ZksyncClient.prototype.getTransactionsInBlock.name, () => {
    it('returns transactions array', async () => {
      const transactions = Array.from({ length: 69 }, () => fakeTransaction())

      const httpClient = mock<HttpClient>({
        fetch: async () =>
          new Response(
            JSON.stringify({
              status: 'success',
              error: null,
              result: { list: transactions, pagination: { count: 69 } },
            }),
          ),
      })
      const zksyncClient = new ZksyncClient(httpClient, Logger.SILENT)
      const expected = transactions.map((tx) => ({
        ...tx,
        createdAt: UnixTime.fromDate(tx.createdAt),
      }))

      expect(await zksyncClient.getTransactionsInBlock(42)).toEqual(expected)
    })

    it('can paginate', async () => {
      const transactions1 = Array.from({ length: 100 }, () => fakeTransaction())
      const transactions2 = Array.from({ length: 69 }, () => fakeTransaction())

      const httpClient = mock<HttpClient>({
        fetch: mockFn()
          .resolvesToOnce(
            new Response(
              JSON.stringify({
                status: 'success',
                error: null,
                result: { list: transactions1, pagination: { count: 169 } },
              }),
            ),
          )
          .resolvesToOnce(
            new Response(
              JSON.stringify({
                status: 'success',
                error: null,
                result: {
                  list: [transactions1[0], ...transactions2],
                  pagination: { count: 169 },
                },
              }),
            ),
          ),
      })

      const zksyncClient = new ZksyncClient(httpClient, Logger.SILENT)

      const result = await zksyncClient.getTransactionsInBlock(42)
      const expected = transactions1
        .concat(transactions2)
        .map((tx) => ({ ...tx, createdAt: UnixTime.fromDate(tx.createdAt) }))
      expect(result).toEqual(expected)
    })
  })

  describe(ZksyncClient.prototype.getLatestBlock.name, () => {
    it('gets latest block', async () => {
      const httpClient = mock<HttpClient>({
        fetch: async () =>
          new Response(
            JSON.stringify({
              status: 'success',
              error: null,
              result: { blockNumber: 42 },
            }),
          ),
      })
      const zksyncClient = new ZksyncClient(httpClient, Logger.SILENT)

      const result = await zksyncClient.getLatestBlock()
      expect(result).toEqual(42)
    })
  })

  describe(ZksyncClient.prototype.call.name, () => {
    it('throws for error responses', async () => {
      const httpClient = mock<HttpClient>({
        async fetch() {
          return new Response(
            JSON.stringify({
              status: 'error',
              error: { errorType: 'type', code: 45, message: 'Oops!' },
              result: null,
            }),
          )
        },
      })
      const zksyncClient = new ZksyncClient(httpClient, Logger.SILENT)
      await expect(zksyncClient.call('foo', { bar: '1234' })).toBeRejected(
        Error,
        'Oops!',
      )
    })

    it('throws for malformed responses', async () => {
      const httpClient = mock<HttpClient>({
        async fetch() {
          return new Response(JSON.stringify({ status: '', foo: 'bar' }))
        },
      })
      const zksyncClient = new ZksyncClient(httpClient, Logger.SILENT)
      await expect(zksyncClient.call('foo', { bar: '1234' })).toBeRejected(
        TypeError,
        'Invalid Zksync response.',
      )
    })

    it('throws for http errors', async () => {
      const httpClient = mock<HttpClient>({
        async fetch() {
          return new Response('foo', { status: 400 })
        },
      })
      const zksyncClient = new ZksyncClient(httpClient, Logger.SILENT)
      await expect(zksyncClient.call('foo', { bar: '1234' })).toBeRejected(
        Error,
        'Http error 400: foo',
      )
    })
  })
})

interface Transaction {
  txHash: string
  blockIndex: number
  createdAt: Date
}

function fakeTransaction(transaction?: Partial<Transaction>): Transaction {
  return {
    txHash: 'tx-hash',
    blockIndex: Math.floor(Math.random() * 1000),
    createdAt: new Date(0),
    ...transaction,
  }
}
