import { PropsWithChildren, useRef } from "react";
import { Middleware } from "./lib";
import xs, { Stream } from "xstream";
import {
  HTTPSource,
  RequestInput,
  RequestOptions,
  Response,
} from "@cycle/http";
import { compose } from "rambda";
import { useMemo } from "use-memo-one";
import * as uuid from "uuid";

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
    let started = false;
    const buffer: RequestOptions[] = [];
    const HTTP = xs.create<RequestOptions>({
      start(l) {
        Promise.resolve().then(() => {
          buffer.forEach((x) => l.next(x));
          buffer.splice(0, buffer.length);
          started = true;
        });
      },
      stop() {
        started = false;
      },
    });
    const sinks = child({
      ...sources,
      request(options) {
        const category = uuid.v4();

        if (!started) buffer.push({ ...options, category });
        else HTTP.shamefullySendNext({ ...options, category });

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

export function RequestMiddleware(props: PropsWithChildren<{ token: string }>) {
  const { children, token } = props;
  const tokenRef = useRef(token);
  tokenRef.current = token;

  return (
    <Middleware
      middleware={useMemo(
        () =>
          compose(
            withAuthentication(() => tokenRef.current),
            withMonadicHTTP as any
          ) as any,
        []
      )}
    >
      {children}
    </Middleware>
  );
}
