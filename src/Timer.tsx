import { useCycleApp, useStreamify } from "./lib";
import xs, { Stream } from "xstream";
import { Response } from "@cycle/http";
import { AppSinks, AppSources } from "./App";

type AppResults = Stream<{
  response: Response;
  timer: number;
}>;

export function Timer(props: { delay: number }) {
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
