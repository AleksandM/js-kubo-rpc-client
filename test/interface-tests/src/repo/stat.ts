/* eslint-env mocha */

import { expectIsRepo } from '../stats/utils.js'
import { getDescribe, getIt, type MochaConfig } from '../utils/mocha.js'
import type { KuboRPCClient } from '../../../../src/index.js'
import type { KuboRPCFactory } from '../index.js'

export function testStat (factory: KuboRPCFactory, options: MochaConfig): void {
  const describe = getDescribe(options)
  const it = getIt(options)

  describe('.repo.stat', () => {
    let ipfs: KuboRPCClient

    before(async function () {
      ipfs = (await factory.spawn()).api
    })

    after(async function () {
      await factory.clean()
    })

    it('should get repo stats', async () => {
      const res = await ipfs.repo.stat()
      expectIsRepo(null, res)
    })
  })
}