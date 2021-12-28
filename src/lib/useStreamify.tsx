import { useEffect, useRef } from "react";
import xs, { MemoryStream } from "xstream";
import { useMemo } from "use-memo-one";

export function useStreamify<T>(value: T): MemoryStream<T> {
  const valueRef = useRef(value);
  valueRef.current = value;

  const subject = useMemo(() => {
    return xs.createWithMemory<T>();
  }, []);

  useEffect(() => {
    subject.shamefullySendNext(valueRef.current);
    // eslint-disable-next-line
  }, [value, subject]);

  return subject;
}
