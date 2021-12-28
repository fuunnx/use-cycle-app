import { Drivers, Sources } from "@cycle/run";
import { PropsWithChildren } from "react";
import { useMemo } from "use-memo-one";
import {
  createSinksProxy,
  CycleContext,
  useCycleContext,
} from "./cycleAppContext";
import { CycleApp, DriversSinks } from "./types";
import { useSendDriversEffects } from "./useCycleApp";

type Props<D1 extends Drivers, D2 extends Drivers = D1> = {
  driverKeys?: string[];
  middleware: (
    child: (sources: Sources<D2>) => DriversSinks<D2>
  ) => (sources: Sources<D1>) => DriversSinks<D1>;
};

export function Middleware<D1 extends Drivers, D2 extends Drivers = D1>(
  props: PropsWithChildren<Props<D1, D2>>
) {
  const { children, middleware } = props;

  const parentApp = useCycleContext<D1>();
  const sources = parentApp.sources;
  const driverKeys = Array.from(
    new Set([...parentApp.driverKeys, ...(props.driverKeys ?? [])])
  );

  const [childSinks, registerSinks] = useMemo(
    () => createSinksProxy(driverKeys),
    [driverKeys.join()]
  );

  const [childSources, sinks] = useMemo(() => {
    let so: Sources<D2> | null = null;
    const wrapped = middleware((decoratedSources: Sources<D2>) => {
      so = decoratedSources;
      return childSinks as any;
    });
    let si = wrapped(sources as any);

    if (so === null) {
      throw Error('You have to call "child" with your sources');
    }

    return [so, si] as const;
  }, [sources, childSinks]);

  useSendDriversEffects(sinks);

  const app = useMemo<CycleApp<D2>>(() => {
    return {
      driverKeys,
      sources: childSources,
      registerSinks,
    };
  }, [driverKeys.join(), childSources, registerSinks]);

  return <CycleContext.Provider value={app}>{children}</CycleContext.Provider>;
}
