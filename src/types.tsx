import { DisposeFunction } from '@cycle/run'
import { Stream, MemoryStream } from 'xstream'

export type AnyRecord = Record<string, any>
export type AnyArray = any[]

export type Sinks = Record<string, any>
export type Sink$s = Record<string, Stream<any>>
export type RecordOfStreams<T> = {
  [K in keyof T]: Stream<T[K]>
}

export interface MainFunc<S, Deps = []> {
  (deps: MemoryStream<Deps>): RecordOfStreams<S>
}

export interface EffectMainFunc<So extends AnyRecord, Si extends Sink$s, S> {
  (sources: So): [RecordOfStreams<S>, Si]
}

export type CycleApp<
  So extends AnyRecord = AnyRecord,
  Si extends Sink$s = Sink$s
> = {
  sources: So
  registerSinks: (sinks: Si) => DisposeFunction
}
