/* eslint-env mocha */

import { expect } from 'aegir/chai'
import all from 'it-all'
import { isPong } from './interface-tests/src/ping/utils.js'
import { factory } from './utils/factory.js'
import type { KuboRPCClient } from '../src/index.js'
import type { PeerId } from '@libp2p/interface'

const f = factory()

// Determine if a ping response object is a pong, or something else, like a status message

describe('.ping', function () {
  this.timeout(20 * 1000)

  let ipfs: KuboRPCClient
  let other: KuboRPCClient
  let otherId: PeerId

  before(async function () {
    this.timeout(30 * 1000) // slow CI

    ipfs = (await f.spawn()).api
    other = (await f.spawn()).api

    const ma = (await ipfs.id()).addresses[0]
    await other.swarm.connect(ma)

    otherId = (await other.id()).id
  })

  after(async function () { return f.clean() })

  it('.ping with default count', async function () {
    const res = await all(ipfs.ping(otherId))
    expect(res).to.be.an('array')
    expect(res.filter(isPong)).to.have.lengthOf(10)
    res.forEach(packet => {
      expect(packet).to.have.keys('success', 'time', 'text')
      expect(packet.time).to.be.a('number')
    })
    const resultMsg = res.find(packet => packet.text.includes('Average latency'))
    expect(resultMsg).to.exist()
  })

  it('.ping with count = 2', async function () {
    const res = await all(ipfs.ping(otherId, { count: 2 }))
    expect(res).to.be.an('array')
    expect(res.filter(isPong)).to.have.lengthOf(2)
    res.forEach(packet => {
      expect(packet).to.have.keys('success', 'time', 'text')
      expect(packet.time).to.be.a('number')
    })
    const resultMsg = res.find(packet => packet.text.includes('Average latency'))
    expect(resultMsg).to.exist()
  })
})
