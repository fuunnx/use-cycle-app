import { useRef } from "react";
import { MemoryStream, Stream } from "xstream";
import { useSyncExternalStore } from "use-sync-external-store";

type StreamError<S> = {
  isError: true;
  isLoading?: false;
  isSuccess?: false;

  error: any;
  data?: S;
};

type StreamLoading = {
  isError?: false;
  isLoading: true;
  isSuccess?: false;

  error?: undefined;
  data?: undefined;
};

type StreamSuccess<S> = {
  isError?: false;
  isLoading?: false;
  isSuccess: true;

  error?: undefined;
  data: S;
};

export type StreamData<S> = (
  | StreamLoading
  | StreamError<S>
  | StreamSuccess<S>
) & {
  isComplete?: boolean;
};

export function useStream<S>(
  stream: Stream<S> | MemoryStream<S>
): StreamData<S> {
  const valueRef = useRef<StreamData<S>>({ isLoading: true });

  return useSyncExternalStore<StreamData<S>>(
    function subscribe(notifyChange) {
      const sub = stream.subscribe({
        next(value) {
          valueRef.current = {
            isSuccess: true,
            data: value,
          };
          notifyChange();
        },
        error(error) {
          valueRef.current = {
            isError: true,
            data: valueRef.current.data,
            error,
          };
          notifyChange();
        },
        complete() {
          valueRef.current = {
            ...valueRef.current,
            isComplete: true,
          };
        },
      });

      return () => sub.unsubscribe();
    },
    function getSnapshot() {
      return valueRef.current;
    }
  );
}
