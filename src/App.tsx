import { RefObject, useRef, useState } from "react";
import { CycleAppProvider, DriversSinks, Middleware } from "./lib";
import xs, { Stream } from "xstream";
import {
  HTTPSource,
  makeHTTPDriver,
  RequestInput,
  RequestOptions,
  Response,
} from "@cycle/http";
import { Sources } from "@cycle/run";
import { compose } from "rambda";
import { useMemo } from "use-memo-one";
import { Timer } from "./Timer";
import * as uuid from "uuid";

export type AppDrivers = typeof drivers;
export type AppSources = Sources<typeof drivers>;
export type AppSinks = DriversSinks<typeof drivers>;

const drivers = {
  HTTP: makeHTTPDriver(),
  log: (out$: Stream<any>) => out$.addListener({ next: console.log }),
};

function decorateLogs(prefix: RefObject<string>) {
  return (child: (sources: AppSources) => AppSinks) => (sources: AppSources) => {
    const sinks = child(sources);

    return {
      ...sinks,
      log: sinks.log?.map((x: unknown) => `[${prefix.current}]: ${x}`),
    };
  };
}

export type WithRequest = {
  request: (options: RequestOptions) => Stream<Response>;
};

function withMonadicHTTP<
  So extends { HTTP: HTTPSource },
  Si extends { HTTP: Stream<RequestInput>; log: Stream<any> }
>(
  child: (
    sources: So & { request: (options: RequestOptions) => Stream<Response> }
  ) => Si
) {
  return (sources: So) => {
    const HTTP = xs.create<RequestOptions>();
    const sinks = child({
      ...sources,
      request(options) {
        const category = uuid.v4();
        HTTP.shamefullySendNext({ ...options, category });
        return (sources.HTTP.select(category) as any).flatten();
      },
    });

    return {
      ...sinks,
      log: xs.merge(
        sinks.log ?? xs.empty(),
        HTTP.map((req) => `requesting: ${JSON.stringify(req)}`)
      ),
      HTTP: xs.merge(sinks.HTTP ?? xs.empty(), HTTP),
    };
  };
}

function withAuthentication<
  So extends { HTTP: HTTPSource },
  Si extends { HTTP: Stream<RequestInput> }
>(getToken: () => string) {
  return (child: (sources: So) => Si) =>
    (sources: So): Si => {
      const sinks = child(sources);

      return {
        ...sinks,
        HTTP: sinks.HTTP?.map((req) => {
          if (typeof req === "string") return { url: req };
          return {
            ...req,
            headers: { ...req.headers, Authentication: `Bearer ${getToken()}` },
          };
        }),
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
        <Middleware
          middleware={useMemo(
            () =>
              compose(
                decorateLogs(prefixRef),
                withAuthentication(() => "token"),
                withMonadicHTTP as any
              ) as any,
            []
          )}
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
