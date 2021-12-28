import { useCycleApp, useStreamify } from "./lib";
import xs from "xstream";
import { AppSinks, AppSources, WithRequest } from "./App";

type Props = { delay: number };

export function Timer(props: Props) {
  const { delay } = props;
  const delay$ = useStreamify(delay);

  const { data } = useCycleApp(
    function main(sources: AppSources & WithRequest) {
      const { request } = sources;
      const timer$ = delay$
        .map((delay) => xs.periodic(delay))
        .flatten()
        .fold((prev) => prev + 1, 0);

      const response$ = delay$
        .map((delay) => request({ url: "/lol" + delay }))
        .flatten();

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
