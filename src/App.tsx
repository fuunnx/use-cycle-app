import { FC, useMemo, useState } from 'react'
import { replicateMany } from '@cycle/run/lib/cjs/internals'

import {
  useCycleApp,
  useSendDriversEffects,
  useGetDriversSources,
} from "./useCycleApp";
import { CycleAppProvider, CycleContext } from "./cycleAppContext";
import xs, { Stream } from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";
import sampleCombine from "xstream/extra/sampleCombine";
import {
  HTTPSource,
  makeHTTPDriver,
  Response,
  RequestOptions,
} from "@cycle/http";
import { useStreamify } from "./useStreamify";
import { Sources } from "@cycle/run";
import { DriversSinks } from "./types";

type AppSources = Sources<Drivers>;
type AppSinks = DriversSinks<Drivers>;

type AppResults = Stream<{
  response?: Response;
  timer: number;
}>;

function Timer(props: { delay: number }) {
  const props$ = useStreamify(props);

  const { timer, response } = useCycleApp(
    function main(sources: AppSources): [AppResults, AppSinks] {
      const delay$ = props$.map((x) => x.delay).compose(dropRepeats());

      const effects: AppSinks = {
        log: delay$,
        HTTP: delay$.map((delay) => {
          return { url: "/lol" + delay };
        }),
      };

      const values = xs
        .combine(
          (sources.HTTP.select() as unknown as Stream<Stream<Response>>)
            .flatten()
            .remember() as Stream<Response>,
          delay$
            .map((delay) => xs.periodic(delay))
            .flatten()
            .fold((prev) => prev + 1, 0)
        )
        .map(([response, timer]) => {
          return { response, timer };
        });

      return [values, effects];
    },
    { response: undefined, timer: 0 },
    []
  );

  return (
    <>
      <h2>Timer: {timer}</h2>
      <pre>
        {response?.request.url} {response?.status}
      </pre>
    </>
  );
}

const drivers = {
  HTTP: makeHTTPDriver(),
  log: (out$: Stream<any>) => out$.addListener({ next: console.log }),
};

type Drivers = typeof drivers;

const driversKeys = Object.keys(drivers);
function intercept(sources: AppSources, ownSinks: AppSinks) {
  return [
    { ...sources, cache$: xs.of("yo") },
    { ...ownSinks, log: ownSinks.log.map((x) => x.toUpperCase()) },
  ];
}

const Interceptor: FC = function Interceptor(props) {
  const { children } = props;
  const sources = useGetDriversSources();
  const { ownSinks, registerSinks } = useMemo(() => {
    const ownSinks = Object.fromEntries(
      driversKeys.map((key) => [key, xs.create()])
    );
    return {
      ownSinks,
      registerSinks(sinks: any) {
        console.log(sinks);
        return replicateMany(sinks, ownSinks);
      },
    };
  }, []);

  const [ownSources, sinks] = useMemo(() => {
    return intercept(sources as any, ownSinks as any);
  }, [sources, ownSinks]);

  useSendDriversEffects(sinks as any);

  return (
    <CycleContext.Provider value={{ sources: ownSources, registerSinks }}>
      {children}
    </CycleContext.Provider>
  );
};

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
