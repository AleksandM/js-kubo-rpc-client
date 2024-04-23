/* eslint-env mocha */

import { expect } from 'aegir/chai'
import all from 'it-all'
import last from 'it-last'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { nanoid } from 'nanoid'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { getDescribe, getIt, type MochaConfig } from '../utils/mocha.js'
import type { KuboRPCClient } from '../../../../src/index.js'
import type { Factory, KuboNode } from 'ipfsd-ctl'

export function testRm (factory: Factory<KuboNode>, options: MochaConfig): void {
  const describe = getDescribe(options)
  const it = getIt(options)

  describe('.block.rm', () => {
    let ipfs: KuboRPCClient

    before(async function () { ipfs = (await factory.spawn()).api })

    after(async function () {
      await factory.clean()
    })

    it('should remove by CID object', async () => {
      const cid = await ipfs.dag.put(uint8ArrayFromString(nanoid()), {
        storeCodec: 'raw',
        hashAlg: 'sha2-256'
      })

      // block should be present in the local store
      const localRefs = await all(ipfs.refs.local())
      expect(localRefs).to.have.property('length').that.is.greaterThan(0)
      expect(localRefs.find(ref => ref.ref === CID.createV1(raw.code, cid.multihash).toString())).to.be.ok()

      const result = await all(ipfs.block.rm(cid))
      expect(result).to.be.an('array').and.to.have.lengthOf(1)
      expect(result[0].cid.toString()).equal(cid.toString())
      expect(result[0]).to.not.have.property('error')

      // did we actually remove the block?
      const localRefsAfterRemove = await all(ipfs.refs.local())
      expect(localRefsAfterRemove.find(ref => ref.ref === CID.createV1(raw.code, cid.multihash).toString())).to.not.be.ok()
    })

    it('should remove multiple CIDs', async () => {
      const cids = await Promise.all([
        ipfs.dag.put(uint8ArrayFromString(nanoid()), {
          storeCodec: 'raw',
          hashAlg: 'sha2-256'
        }),
        ipfs.dag.put(uint8ArrayFromString(nanoid()), {
          storeCodec: 'raw',
          hashAlg: 'sha2-256'
        }),
        ipfs.dag.put(uint8ArrayFromString(nanoid()), {
          storeCodec: 'raw',
          hashAlg: 'sha2-256'
        })
      ])

      const result = await all(ipfs.block.rm(cids))

      expect(result).to.have.lengthOf(3)

      result.forEach((res) => {
        expect(cids.map(cid => cid.toString())).to.include(res.cid.toString())
        expect(res).to.not.have.property('error')
      })
    })

    it('should error when removing non-existent blocks', async () => {
      const cid = await ipfs.dag.put(uint8ArrayFromString(nanoid()), {
        storeCodec: 'raw',
        hashAlg: 'sha2-256'
      })

      // remove it
      await all(ipfs.block.rm(cid))

      // remove it again
      const result = await all(ipfs.block.rm(cid))

      expect(result).to.be.an('array').and.to.have.lengthOf(1)
      expect(result).to.have.nested.property('[0].error.message').that.is.not.empty()
    })

    it('should not error when force removing non-existent blocks', async () => {
      const cid = await ipfs.dag.put(uint8ArrayFromString(nanoid()), {
        storeCodec: 'raw',
        hashAlg: 'sha2-256'
      })

      // remove it
      await all(ipfs.block.rm(cid))

      // remove it again
      const result = await all(ipfs.block.rm(cid, { force: true }))

      expect(result).to.be.an('array').and.to.have.lengthOf(1)
      expect(result[0].cid.toString()).to.equal(cid.toString())
      expect(result[0]).to.not.have.property('error')
    })

    it('should return empty output when removing blocks quietly', async () => {
      const cid = await ipfs.dag.put(uint8ArrayFromString(nanoid()), {
        storeCodec: 'raw',
        hashAlg: 'sha2-256'
      })
      const result = await all(ipfs.block.rm(cid, { quiet: true }))

      expect(result).to.be.an('array').and.to.have.lengthOf(0)
    })

    it('should error when removing pinned blocks', async () => {
      const cid = await ipfs.dag.put(uint8ArrayFromString(nanoid()), {
        storeCodec: 'raw',
        hashAlg: 'sha2-256'
      })
      await ipfs.pin.add(cid)

      const result = await last(ipfs.block.rm(cid))

      expect(result).to.have.property('error').that.is.an('Error')
        .with.property('message').that.includes('pinned')
    })

    it('should throw error for invalid CID input', () => {
      // @ts-expect-error invalid input
      return expect(all(ipfs.block.rm('INVALID CID')))
        .to.eventually.be.rejected()
    })
  })
}
