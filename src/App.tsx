import { useRef, useState } from "react";
import { CycleAppProvider, DriversSinks, Middleware } from "./lib";
import { Stream } from "xstream";
import { makeHTTPDriver } from "@cycle/http";
import { Sources } from "@cycle/run";
import { useMemo } from "use-memo-one";
import { Timer } from "./Timer";
import { RequestMiddleware } from "./RequestMiddleware";

export type AppDrivers = typeof drivers;
export type AppSources = Sources<typeof drivers>;
export type AppSinks = DriversSinks<typeof drivers>;

const drivers = {
  HTTP: makeHTTPDriver(),
  log: (out$: Stream<any>) => out$.addListener({ next: console.log }),
};

function decorateLogs(getPrefix: () => string) {
  return (child: (sources: AppSources) => AppSinks) => (sources: AppSources) => {
    const sinks = child(sources);

    return {
      ...sinks,
      log: sinks.log?.map((x: unknown) => `[${getPrefix()}]: ${x}`),
    };
  };
}

export default function App() {
  const [delay, setDelay] = useState(400);
  const prefixRef = useRef("Timer says");

  return (
    <CycleAppProvider drivers={drivers}>
      <div>
        <h1>Hello CodeSandbox</h1>
        <RequestMiddleware token="your-auth-token">
          <Middleware
            middleware={useMemo(
              () => decorateLogs(() => `(1) ${prefixRef.current}`),
              []
            )}
          >
            <Timer delay={delay} />
          </Middleware>
          <Middleware
            middleware={useMemo(
              () => decorateLogs(() => `(2) ${prefixRef.current}`),
              []
            )}
          >
            <Timer delay={delay} />
          </Middleware>
        </RequestMiddleware>
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
