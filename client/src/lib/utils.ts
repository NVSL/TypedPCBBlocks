import { powerMatNode } from './index';

class Queue {
  matNode: Array<powerMatNode>;
  constructor() {
    this.matNode = new Array();
  }
  enqueue(value: powerMatNode | null): void {
    if (value) {
      this.matNode.push(value);
    }
  }
  dequeue(): powerMatNode | undefined {
    if (this.matNode.length == 0) return undefined;
    else return this.matNode.shift();
  }
  isEmpty(): boolean {
    if (this.matNode.length == 0) return true;
    else return false;
  }
}

class MultiMap<K, V> {
  map: Map<string, V>;
  constructor() {
    this.map = new Map();
  }
  public set(key: K, val: V): Map<string, V> {
    const jsonKey: string = JSON.stringify(key);
    return this.map.set(jsonKey, val);
  }
  public get(key: K): V | null {
    const jsonKey: string = JSON.stringify(key);
    const val = this.map.get(jsonKey);
    return val ? val : null;
  }
  public has(key: K): boolean {
    const jsonKey: string = JSON.stringify(key);
    return this.map.has(jsonKey);
  }
  public entries(): IterableIterator<[K, V]> {
    const iterMap: Map<K, V> = new Map();
    for (const [key, val] of this.map.entries()) {
      const pKey: K = JSON.parse(key);
      iterMap.set(pKey, val);
    }
    return iterMap.entries();
  }
  public values(): IterableIterator<V> {
    return this.map.values();
  }
  public keys(): IterableIterator<K> {
    const iterMap: Map<K, V> = new Map();
    for (const [key, val] of this.map.entries()) {
      const pKey: K = JSON.parse(key);
      iterMap.set(pKey, val);
    }
    return iterMap.keys();
  }
  public forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    thisArg?: any,
  ): void {
    const iterMap: Map<K, V> = new Map();
    for (const [key, val] of this.map.entries()) {
      const pKey: K = JSON.parse(key);
      iterMap.set(pKey, val);
    }
    iterMap.forEach(callbackfn, thisArg);
  }
  public clear(): void {
    this.map.clear();
  }
  public get size(): number {
    return this.map.size;
  }
}

export { Queue, MultiMap };
