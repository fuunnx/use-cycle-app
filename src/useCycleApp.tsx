import { useMemo, useState, useEffect, useCallback } from "react";
import { Stream } from "xstream";

import { EffectMainFunc, DriversSinks } from "./types";
import { useCycleContext } from "./cycleAppContext";
import { Drivers, Main } from "@cycle/run";

export function useGetDriversSources<D extends Drivers>() {
  const { sources } = useCycleContext<D>();
  return sources;
}

export function useSendDriversEffects<D extends Drivers>(
  sinks: DriversSinks<D>
) {
  const { registerSinks } = useCycleContext<D>();
  useEffect(() => registerSinks(sinks), [sinks, registerSinks]);
}

export function useStream<S>(sink: Stream<S>, initialState: S): S {
  const [state, setState] = useState<S>(initialState);
  const [, throwError] = useState<any>();

  useEffect(() => {
    const { unsubscribe } = sink.subscribe({
      next(value) {
        setState(value);
      },
      error(e: any) {
        // so react catches it in error boundary
        throwError(() => {
          throw e;
        });
      },
    });

    return unsubscribe;
  }, [sink, setState, throwError]);

  return state;
}

export function useCycleApp<D extends Drivers, M extends Main, T>(
  mainFunc: EffectMainFunc<D, M, T>,
  defaultValue: T,
  deps: any[]
): T {
  const main = useCallback(mainFunc, deps);

  const sources = useGetDriversSources<D>();
  const [sinks, effects] = useMemo(
    () => main(sources),
    [sources, main] // eslint-disable-line
  );

  useSendDriversEffects<D>(effects);
  return useStream(sinks, defaultValue);
}
