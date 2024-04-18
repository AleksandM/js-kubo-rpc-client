import drain from 'it-drain'

function isAsyncIterator (obj: any): obj is AsyncIterable<any> {
  return obj[Symbol.asyncIterator] != null
}

export default async function testTimeout (fn: any): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // some operations are either synchronous so cannot time out, or complete during
    // processing of the microtask queue so the timeout timer doesn't fire.  If this
    // is the case this is more of a best-effort test..
    setTimeout(() => {
      const start = Date.now()
      let res = fn()

      if (isAsyncIterator(res)) {
        res = drain(res)
      }

      res.then((result: any) => {
        const timeTaken = Date.now() - start

        if (timeTaken < 100) {
          // the implementation may be too fast to measure a time out reliably on node
          // due to the event loop being blocked.  if it took longer than 100ms though,
          // it almost certainly did not time out
          resolve(); return
        }

        reject(new Error(`API call did not time out after ${timeTaken}ms, got ${JSON.stringify(result, null, 2)}`))
      }, (err: any) => {
        if (err.name === 'TimeoutError') {
          resolve(); return
        }

        const timeTaken = Date.now() - start

        reject(new Error(`Expected TimeoutError after ${timeTaken}ms, got ${err.stack}`))
      })
    }, 10)
  })
}