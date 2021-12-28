import { FC, Suspense, useMemo, useState } from "react";
import { replicateMany } from "@cycle/run/lib/cjs/internals";

import {
  useCycleApp,
  useSendDriversEffects,
  useGetDriversSources,
} from "./useCycleApp";
import { CycleAppProvider, CycleContext } from "./cycleAppContext";
import xs, { Stream } from "xstream";
import dropRepeats from "xstream/extra/dropRepeats";
import { makeHTTPDriver, Response, RequestInput } from "@cycle/http";
import { useStreamify } from "./useStreamify";
import { Sources } from "@cycle/run";
import { DriversSinks } from "./types";

type AppSources = Sources<Drivers>;
type AppSinks = DriversSinks<Drivers>;

type AppResults = Stream<{
  response: Response;
  timer: number;
}>;

function Timer(props: { delay: number }) {
  const props$ = useStreamify(props);

  const { data } = useCycleApp(function main(
    sources: AppSources
  ): [AppResults, AppSinks] {
    const delay$ = props$.map((x) => x.delay).compose(dropRepeats());

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

    return [
      values,
      {
        log: xs.merge(
          delay$,
          (sources as any).cache$.map(
            (x: unknown) => `Got ${JSON.stringify(x)} from cache`
          )
        ),
        HTTP: delay$.map((delay): RequestInput => {
          return { url: "/lol" + delay };
        }),
      },
    ];
  },
  []);
  const { timer, response } = data ?? {};

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

function intercept(sinks: AppSinks, parent: (sinks: AppSinks) => AppSources) {
  return {
    ...parent({
      ...sinks,
      log: sinks.log?.map((x: unknown) => `[Intercepted]: ${x}`) as any,
    }),
    cache$: xs.of("yo"),
  };
}

type MiddlewareFunction = (
  sinks: AppSinks,
  parent: (sinks: AppSinks) => AppSources
) => AppSources;
type Props = { middleware: MiddlewareFunction };
const Middleware: FC<Props> = function Interceptor(props) {
  const { children, middleware } = props;
  const sources = useGetDriversSources();
  const driversKeys = Object.keys(drivers);
  const { ownSinks, registerSinks } = useMemo(() => {
    const ownSinks = Object.fromEntries(
      driversKeys.map((key) => [key, xs.create()])
    );
    return {
      ownSinks,
      registerSinks(sinks: any) {
        return replicateMany(sinks, ownSinks);
      },
    };
  }, []);

  const [ownSources, sinks] = useMemo(() => {
    let si: AppSinks | null = null;
    let so = middleware(ownSinks as any, (decoratedSinks: AppSinks) => {
      si = decoratedSinks;
      return sources as any;
    });
    if (si === null) {
      throw Error('You have to call "parent" with your sinks');
    }

    return [so, si] as const;
  }, [sources, ownSinks]);

  useSendDriversEffects(sinks as any);

  return (
    <CycleContext.Provider value={{ sources: ownSources, registerSinks }}>
      {children}
    </CycleContext.Provider>
  );
};

export default function App() {
  const [delay, setDelay] = useState(400);

  return (
    <Suspense fallback={"Suspended"}>
      <CycleAppProvider drivers={drivers}>
        <div>
          <h1>Hello CodeSandbox</h1>
          <Middleware middleware={intercept}>
            <Timer delay={delay} />
          </Middleware>
          <input
            type="number"
            value={delay}
            onChange={(event) =>
              setDelay(parseInt(event.target.value || "0", 10))
            }
            step={200}
          />
        </div>
      </CycleAppProvider>
    </Suspense>
  );
}
