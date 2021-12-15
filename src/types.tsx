import { DisposeFunction, Drivers, Main, Sinks, Sources } from "@cycle/run";
import { Stream } from "xstream";

export type DriversSinks<D extends Drivers> = {
  [k in keyof D]?: Parameters<D[k]>[0];
};

export type EffectMainFunc<D extends Drivers, M extends Main, T> =
  | (Main & {
      (so: Sources<D>): [Stream<T>, Sinks<M>];
    })
  | (Main & {
      (): [Stream<T>, Sinks<M>];
    });

export type CycleApp<D extends Drivers> = {
  sources: Sources<D>;
  registerSinks: (sinks: DriversSinks<D>) => DisposeFunction;
};
