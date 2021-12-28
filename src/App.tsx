import { RefObject, useRef, useState } from "react";
import { CycleAppProvider, DriversSinks, Middleware } from "./lib";
import xs, { Stream } from "xstream";
import { makeHTTPDriver } from "@cycle/http";
import { Sources } from "@cycle/run";
import { compose } from "rambda";
import { useMemo } from "use-memo-one";
import { Timer } from "./Timer";

export type AppSources = Sources<typeof drivers>;
export type AppSinks = DriversSinks<typeof drivers>;

const drivers = {
  HTTP: makeHTTPDriver(),
  log: (out$: Stream<any>) => out$.addListener({ next: console.log }),
};

function decorateLogs(prefix: RefObject<string>) {
  return (child: (sinks: AppSources) => AppSinks) => (sources: AppSources) => {
    const sinks = child(sources);

    return {
      ...sinks,
      log: sinks.log?.map((x: unknown) => `[${prefix.current}]: ${x}`),
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
  const prefixRef = useRef("Timer says");

  return (
    <CycleAppProvider drivers={drivers}>
      <div>
        <h1>Hello CodeSandbox</h1>
        <Middleware
          middleware={useMemo(
            () => compose(withCacheSource, decorateLogs(prefixRef)),
            []
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
          defaultValue={prefixRef.current}
          onChange={(event) => (prefixRef.current = event.target.value)}
        />
      </div>
    </CycleAppProvider>
  );
}
