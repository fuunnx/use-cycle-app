import { useEffect, useMemo, useRef } from 'react'
import xs, { MemoryStream } from 'xstream'

export function useStreamify<T>(value: T): MemoryStream<T> {
  const valueRef = useRef(value);
  valueRef.current = value;

  const subject = useMemo(() => {
    return xs.createWithMemory<T>({
      start(l) {
        Promise.resolve().then(() => {
          l.next(valueRef.current);
        });
      },
      stop() {},
    });
  }, []);

  useEffect(() => {
    subject.shamefullySendNext(valueRef.current);
    // eslint-disable-next-line
  }, [value, subject]);

  return subject;
}
