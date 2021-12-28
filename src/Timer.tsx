import { useCycleApp, useStreamify } from "./lib";
import xs, { MemoryStream, Stream } from "xstream";
import { AppSinks, AppSources } from "./App";
import { WithRequest } from "./RequestMiddleware";
import { Response } from "@cycle/http";

type Props = { delay: number };

export function Timer(props: Props) {
  const { delay } = props;
  const delay$ = useStreamify(delay);

  const { data } = useCycleApp(
    function main(sources: AppSources & WithRequest) {
      const { request } = sources;

      const response$: Stream<Response | null> = delay$
        .debug("delay$")
        .map((delay) =>
          (request({ url: "/lol" + delay }) as any).startWith(null)
        )
        .flatten();

      const timer$ = delay$
        .map((delay) => xs.periodic(delay))
        .flatten()
        .fold((prev) => prev + 1, 0);

      const sinks: AppSinks = {
        log: delay$,
      };

      return [
        xs.combine(response$, timer$).map(([response, timer]) => {
          return { response, timer };
        }),
        sinks,
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
