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
};

export const CycleContext = createContext<CycleApp<{}>>(defaultApp);

export function useCycleContext<D extends Drivers>() {
  const cycleApp = useContext(CycleContext);
  return cycleApp as CycleApp<D>;
}

export interface CycleAppProps<D extends Drivers> {
  drivers: D;
}

export function CycleAppProvider<D extends Drivers>(
  props: PropsWithChildren<CycleAppProps<D>>
) {
  const { children, drivers } = props;
  const [cycleApp, setCycleApp] = useState<CycleApp<D> | null>(null);

  useEffect(() => {
    const driversKeys = Object.keys(drivers);

    const dispose = run((sources: Sources<D>) => {
      let sinksProxy = Object.fromEntries(
        driversKeys.map((key) => [key, xs.create()])
      ) as Required<DriversSinks<D>>;

      function registerSinks(sinks: DriversSinks<D>): DisposeFunction {
        return replicateMany<DriversSinks<D>>(sinks, sinksProxy as any);
      }

      setCycleApp({ sources, registerSinks });
      return sinksProxy;
    }, drivers);

    return () => {
      dispose();
      setCycleApp(null);
    };
  }, [drivers, setCycleApp]);

  if (!cycleApp) {
    return null;
  }

  return (
    <CycleContext.Provider value={cycleApp}>{children}</CycleContext.Provider>
  );
}
