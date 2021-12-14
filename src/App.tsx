import { FC, useMemo, useState } from 'react'
import { replicateMany } from '@cycle/run/lib/cjs/internals'

import { useCycleApp, useDriverEffects, useDriverSources } from './useCycleApp'
import {
  CycleAppProvider,
  CycleContext,
} from './cycleAppContext'
import xs, { Stream } from 'xstream'
import dropRepeats from 'xstream/extra/dropRepeats'
import sampleCombine from 'xstream/extra/sampleCombine'
import {
  HTTPSource,
  makeHTTPDriver,
  Response,
  RequestOptions,
} from '@cycle/http'
import { useStreamify } from './useStreamify'
import { CycleApp } from './types'

type AppSources = {
  HTTP: HTTPSource
}

type AppSinks = {
  HTTP: Stream<RequestOptions>
  log: Stream<any>
}

type AppResults = {
  response: Stream<Response>
  timer: Stream<number>
}

function Timer(props: { delay: number }) {
  const props$ = useStreamify(props)

  const { timer, response } = useCycleApp(function main(
    sources: AppSources,
  ): [AppResults, AppSinks] {
    const delay$ = props$.map((x) => x.delay).compose(dropRepeats())

    const effects = {
      log: delay$,
      HTTP: delay$.map((delay) => ({ url: '/lol' + delay })),
    }

    const values = {
      response: ((sources.HTTP.select() as unknown) as Stream<Stream<Response>>)
        .flatten()
        .remember() as Stream<Response>,

      timer: delay$
        .map((delay) => xs.periodic(delay))
        .flatten()
        .fold((prev) => prev + 1, 0),
    }

    return [values, effects]
  })

  return (
    <>
      <h2>Timer: {timer}</h2>
      <pre>
        {response?.request.url} {response?.status}
      </pre>
    </>
  )
}

const drivers = {
  HTTP: makeHTTPDriver(),
  log: (out$: Stream<any>) => out$.addListener({ next: console.log }),
}

const driversKeys = ['HTTP', 'log']
function intercept(sources: AppSources, ownSinks: AppSinks) {
  return [
    { ...sources, cache$: xs.of('yo') },
    { ...ownSinks, log: ownSinks.log.map((x) => x.toUpperCase()) },
  ]
}

const Interceptor: FC = function Interceptor(props) {
  const { children } = props
  const sources = useDriverSources()
  const { ownSinks, registerSinks } = useMemo(() => {
    const ownSinks = Object.fromEntries(
      driversKeys.map((key) => [key, xs.create()]),
    )
    return {
      ownSinks,
      registerSinks(sinks: any) {
        console.log(sinks)
        return replicateMany(sinks, ownSinks)
      },
    }
  }, [])

  const [ownSources, sinks] = useMemo(() => {
    return intercept(sources as any, ownSinks as any)
  }, [sources, ownSinks])

  useDriverEffects(sinks as any)

  return (
    <CycleContext.Provider value={{ sources: ownSources, registerSinks }}>
      {children}
    </CycleContext.Provider>
  )
}

export default function App() {
  const [delay, setDelay] = useState(400)

  return (
    <CycleAppProvider drivers={drivers}>
      <div>
        <h1>Hello CodeSandbox</h1>
        <Interceptor>
          <Timer delay={delay} />
        </Interceptor>
        <input
          type="number"
          value={delay}
          onChange={(event) =>
            setDelay(parseInt(event.target.value || '0', 10))
          }
          step={200}
        />
      </div>
    </CycleAppProvider>
  )
}
