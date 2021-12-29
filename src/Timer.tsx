import { useCycleApp, useStreamify } from "./lib";
import xs, { Stream } from "xstream";
import { AppSources } from "./App";
import { WithRequest } from "./RequestMiddleware";
import { Response } from "@cycle/http";

type Props = { delay: number };

function useTimer(delay: number) {
  const delay$ = useStreamify(delay);
  const { data } = useCycleApp(() => {
    const timer$ = delay$
      .map((delay) => xs.periodic(delay))
      .flatten()
      .fold((prev) => prev + 1, 0);

    return [timer$, { log: delay$ }];
  }, []);

  return data;
}

function useRequest(url: string) {
  const url$ = useStreamify(url);

  const { data } = useCycleApp(
    function main(sources: AppSources & WithRequest) {
      const { request } = sources;

      const response$: Stream<Response | null> = url$
        .map((url) => (request({ url }) as any).startWith(null))
        .flatten();

      return [response$];
    },
    [url$]
  );

  return data;
}

export function Timer(props: Props) {
  const { delay } = props;

  const response = useRequest(`/lol/${delay}`);
  const timer = useTimer(delay);

  return (
    <>
      <h2>Timer: {timer}</h2>
      <pre>
        {response?.request.url} {response?.status}
      </pre>
    </>
  );
}
