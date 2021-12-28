import { useMemo, useEffect, useCallback } from "react";
import { EffectMainFunc, DriversSinks } from "./types";
import { useCycleContext } from "./cycleAppContext";
import { Drivers, Main } from "@cycle/run";
import { useStream } from "./useStream";

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

export function useCycleApp<D extends Drivers, M extends Main, T>(
  mainFunc: EffectMainFunc<D, M, T>,
  deps: any[]
) {
  const main = useCallback(mainFunc, deps);

  const sources = useGetDriversSources<D>();
  const [sinks, effects] = useMemo(() => main(sources), [sources, main]);

  useSendDriversEffects<D>(effects);
  return useStream<T>(sinks);
}
