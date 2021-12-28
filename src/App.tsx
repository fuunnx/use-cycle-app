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
import { Middleware } from "./Middleware";
import { compose } from "rambda";

type AppSources = Sources<typeof drivers>;
type AppSinks = DriversSinks<typeof drivers>;

type AppResults = Stream<{
  response: Response;
  timer: number;
}>;

function Timer(props: { delay: number }) {
  const { delay } = props;
  const delay$ = useStreamify(delay);

  const { data } = useCycleApp(
    function main(sources: AppSources): [AppResults, AppSinks] {
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
          HTTP: delay$.map((delay) => ({ url: "/lol" + delay })) as any,
        },
      ];
    },
    [delay$]
  );
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

function decorateLogs(prefix: string) {
  return function (child: (sinks: AppSources) => AppSinks) {
    return (sources: AppSources) => {
      const sinks = child(sources);

      return {
        ...sinks,
        log: sinks.log?.map((x: unknown) => `[${prefix}]: ${x}`),
      };
    };
  };
}

function withCacheSource<T extends Sources<any>, U extends DriversSinks<any>>(
  child: (sinks: T & { cache$: Stream<string> }) => U
) {
  return (sources: T) => child({ ...sources, cache$: xs.of("YO") });
}

export default function App() {
  const [delay, setDelay] = useState(400);

  return (
    <CycleAppProvider drivers={drivers}>
      <div>
        <h1>Hello CodeSandbox</h1>
        <Middleware
          middleware={compose(withCacheSource, decorateLogs("Timer said"))}
          driverKeys={['cache$']}
        >
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
  );
}
