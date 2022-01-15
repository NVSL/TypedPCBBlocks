import { powerMatNode } from './tscheda';

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
  public entries(): IterableIterator<[string, V]> {
    return this.map.entries();
  }
  public values(): IterableIterator<V> {
    return this.map.values();
  }
  public keys(): IterableIterator<string> {
    return this.map.keys();
  }
  public forEach(
    callbackfn: (value: V, key: string, map: Map<string, V>) => void,
    thisArg?: any,
  ): void {
    this.map.forEach(callbackfn, thisArg);
  }
  public clear(): void {
    this.map.clear();
  }
  public get size(): number {
    return this.map.size;
  }
}

export { Queue, MultiMap };
