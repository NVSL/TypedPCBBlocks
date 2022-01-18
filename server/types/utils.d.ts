import { powerMatNode } from './tscheda';
declare class Queue {
    matNode: Array<powerMatNode>;
    constructor();
    enqueue(value: powerMatNode | null): void;
    dequeue(): powerMatNode | undefined;
    isEmpty(): boolean;
}
declare class MultiMap<K, V> {
    map: Map<string, V>;
    constructor();
    set(key: K, val: V): Map<string, V>;
    get(key: K): V | null;
    has(key: K): boolean;
    entries(): IterableIterator<[K, V]>;
    values(): IterableIterator<V>;
    keys(): IterableIterator<K>;
    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void;
    clear(): void;
    get size(): number;
}
export { Queue, MultiMap };
