import { useEffect, useMemo, useRef } from 'react'
import xs, { MemoryStream } from 'xstream'

export function useStreamify<Deps extends AnyArray | AnyRecord>(
  deps: Deps,
): MemoryStream<Deps> {
  const dependencies = Array.isArray(deps)
    ? deps
    : [...Object.keys(deps as AnyRecord), ...Object.values(deps as AnyRecord)]

  const currDeps = useRef(deps)
  currDeps.current = deps

  const subject = useMemo(
    () => {
      return xs.createWithMemory<Deps>({
        start(l) {
          Promise.resolve().then(() => {
            l.next(currDeps.current)
          })
        },
        stop() {},
      })
    },
    [], // eslint-disable-line
  )

  useEffect(() => {
    subject.shamefullySendNext(currDeps.current)
    // eslint-disable-next-line
  }, [...dependencies, subject])

  return subject
}
