import { useMemo, useState, useLayoutEffect } from 'react'
import { MemoryStream, Stream, Subscription } from 'xstream'
import { map } from 'rambda'

import {
  Sinks,
  AnyArray,
  AnyRecord,
  RecordOfStreams,
  MainFunc,
  Sink$s,
  EffectMainFunc,
} from './types'
import { useCycleContext } from './cycleAppContext'

export function useDriverSources<
  So extends AnyRecord = Record<string, unknown>
>() {
  const { sources } = useCycleContext()
  return sources as So
}

export function useDriverEffects<
  Si extends Sink$s = Record<string, Stream<unknown>>
>(sinks: Si) {
  const { registerSinks } = useCycleContext()
  useLayoutEffect(() => {
    const dispose = registerSinks(sinks)
    return () => dispose()
  }, [sinks, registerSinks])
}

export function useCycle<Si, So extends AnyRecord>(
  mainFunc: (sources: So) => Si,
): Si {
  const sources = useDriverSources<So>()
  return useMemo(
    () => mainFunc(sources),
    [sources], // eslint-disable-line
  )
}

export function useSinks<S>(sinks: RecordOfStreams<S>): Partial<S> {
  const [state, setState] = useState<Partial<S>>(
    map(
      (sink: MemoryStream<any> | Stream<any>) => (sink as any)._v,
      sinks,
    ) as any,
  )
  const [, throwError] = useState<any>()

  useLayoutEffect(() => {
    const subscriptions: Subscription[] = []
    Object.keys(sinks).forEach((sinkName) => {
      const sink = sinks[sinkName as keyof S]
      subscriptions.push(
        sink.subscribe({
          next(value) {
            setState((prev) => ({ ...prev, [sinkName]: value }))
          },
          error(e: any) {
            // so react catches it in error boundary
            throwError(() => {
              throw e
            })
          },
        }),
      )
    })

    return () => {
      subscriptions.forEach((subscription) => {
        subscription.unsubscribe()
      })
    }
    // eslint-disable-next-line
  }, [sinks, setState, throwError])

  return state
}

export function useCycleValues<
  S extends Sinks,
  Deps extends AnyArray | AnyRecord
>(mainFunc: MainFunc<S, Deps>): Partial<S> {
  const sinks = useCycle(mainFunc)
  return useSinks(sinks)
}

export function useCycleApp<
  So extends AnyRecord,
  Si extends Sink$s,
  S extends Sinks
>(mainFunc: EffectMainFunc<So, Si, S>): Partial<S> {
  const [sinks, effects] = useCycle(mainFunc)
  useDriverEffects(effects)
  return useSinks(sinks)
}
