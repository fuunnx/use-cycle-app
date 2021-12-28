import { useState } from "react";
import {
  useCycleApp,
  CycleAppProvider,
  useStreamify,
  DriversSinks,
  Middleware,
} from "./lib";
import xs, { Stream } from "xstream";
import { makeHTTPDriver, Response } from "@cycle/http";
import { Sources } from "@cycle/run";
import { compose } from "rambda";
import { useMemo } from "use-memo-one";

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
  const [prefix, setPrefix] = useState("Timer says");

  return (
    <CycleAppProvider drivers={drivers}>
      <div>
        <h1>Hello CodeSandbox</h1>
        <Middleware
          middleware={useMemo(
            () => compose(withCacheSource, decorateLogs(prefix)),
            [prefix]
          )}
          driverKeys={["cache$"]}
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
        <input
          type="text"
          value={prefix}
          onChange={(event) => setPrefix(event.target.value)}
          step={200}
        />
      </div>
    </CycleAppProvider>
  );
}
