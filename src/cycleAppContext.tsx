import run, { Drivers, DisposeFunction } from '@cycle/run'
import { createContext, useContext, FC, useState, useEffect } from 'react'
import xs from 'xstream'
import { CycleApp, Sink$s, AnyRecord } from './types'
import { replicateMany } from '@cycle/run/lib/cjs/internals'

const defaultApp: CycleApp = {
  sources: new Proxy(
    {},
    {
      get() {
        throw new Error(
          'Please add a CycleContextProvider at the root of your application',
        )
      },
    },
  ),
  registerSinks: () => {
    throw new Error(
      'Please add a CycleContextProvider at the root of your application',
    )
  },
}

export const CycleContext = createContext<CycleApp>(defaultApp)

export function useCycleContext<
  So extends AnyRecord,
  Si extends Sink$s = Sink$s
>() {
  const cycleApp = useContext(CycleContext)
  return cycleApp as CycleApp<So, Si>
}

export const CycleAppProvider: FC<{
  drivers: Drivers
}> = function CycleAppProvider(props) {
  const { children, drivers } = props
  const [cycleApp, setCycleApp] = useState<CycleApp | null>(null)

  useEffect(() => {
    const driversKeys = Object.keys(drivers)

    const dispose = run((sources: Record<string, any>) => {
      let sinksProxy = Object.fromEntries(
        driversKeys.map((key) => [key, xs.create()]),
      )

      function registerSinks(sinks: Sink$s): DisposeFunction {
        return replicateMany(sinks, sinksProxy)
      }

      setCycleApp({ sources, registerSinks })
      return sinksProxy
    }, drivers)

    return () => {
      dispose()
      setCycleApp(null)
    }
  }, [drivers, setCycleApp])

  if (!cycleApp) {
    return null
  }

  return (
    <CycleContext.Provider value={cycleApp}>{children}</CycleContext.Provider>
  )
}
