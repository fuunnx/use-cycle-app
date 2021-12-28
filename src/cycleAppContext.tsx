import run, { Drivers, DisposeFunction, Sources } from "@cycle/run";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  PropsWithChildren,
} from "react";
import xs from "xstream";
import { CycleApp, DriversSinks } from "./types";
import { replicateMany } from "@cycle/run/lib/cjs/internals";

const defaultApp: CycleApp<{}> = {
  sources: new Proxy(
    {},
    {
      get() {
        throw new Error(
          "Please add a CycleContextProvider at the root of your application"
        );
      },
    }
  ),
  registerSinks: () => {
    throw new Error(
      "Please add a CycleContextProvider at the root of your application"
    );
  },
  driverKeys: [],
};

export const CycleContext = createContext<CycleApp<{}>>(defaultApp);

export function useCycleContext<D extends Drivers>() {
  const cycleApp = useContext(CycleContext);
  return cycleApp as CycleApp<D>;
}

export interface CycleAppProps<D extends Drivers> {
  drivers: D;
}

export function createSinksProxy<D extends Drivers>(driversKeys: string[]) {
  let sinksProxy = Object.fromEntries(
    driversKeys.map((key) => [key, xs.create()])
  ) as Required<DriversSinks<D>>;

  function registerSinks(sinks: DriversSinks<D>): DisposeFunction {
    return replicateMany<DriversSinks<D>>(sinks, sinksProxy as any);
  }

  return [sinksProxy, registerSinks] as const;
}

export function CycleAppProvider<D extends Drivers>(
  props: PropsWithChildren<CycleAppProps<D>>
) {
  const { children, drivers } = props;

  const [app, setApp] = useState<CycleApp<D> | null>(null);

  useEffect(() => {
    const driverKeys = Object.keys(drivers);
    const [sinks, registerSinks] = createSinksProxy<D>(driverKeys);

    const dispose = run((sources: Sources<D>) => {
      setApp({ sources, registerSinks, driverKeys });
      return sinks;
    }, drivers);

    return () => {
      dispose();
      setApp(null);
    };
  }, [drivers, setApp]);

  if (!app) {
    return null;
  }

  return <CycleContext.Provider value={app}>{children}</CycleContext.Provider>;
}
