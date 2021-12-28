import { useMemo, useEffect, useCallback } from "react";
import { DriversSinks } from "./types";
import { useCycleContext } from "./cycleAppContext";
import { Drivers, Sources } from "@cycle/run";
import { useStream } from "./useStream";
import { Stream } from "xstream";

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

export function useCycleApp<
  AppSources extends Sources<Drivers>,
  AppSinks extends DriversSinks<Drivers>,
  T
>(
  mainFunc: (sources: AppSources) => [Stream<T>, AppSinks] | [Stream<T>],
  deps: any[]
) {
  const main = useCallback(mainFunc, deps);

  const sources = useGetDriversSources();
  const [sinks, effects] = useMemo(
    () => main(sources as AppSources),
    [sources, main]
  );

  useSendDriversEffects(effects ?? {});
  return useStream<T>(sinks);
}
