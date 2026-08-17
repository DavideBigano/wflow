import { useMemo, useState, useTransition } from 'react';

export function usePromise<T>(
    promise: Promise<T> | (() => Promise<T>),
    deps: React.DependencyList = [],
): [promise: Promise<T>, refresh: () => void] {
    const [version, setVersion] = useState(0);
    const [, startTransition] = useTransition();

    // biome-ignore lint/correctness/useExhaustiveDependencies: `version` is needed to break cache
    const stablePromise = useMemo(() => {
        if (typeof promise === 'function') {
            return promise();
        }
        return promise;
    }, [...deps, version]);

    const refresh = () => {
        startTransition(() => {
            setVersion((v) => v + 1);
        });
    };

    return [stablePromise, refresh];
}
