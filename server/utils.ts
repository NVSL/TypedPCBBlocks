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

export { Queue };
