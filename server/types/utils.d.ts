import { powerMatNode } from './tscheda';
declare class Queue {
    matNode: Array<powerMatNode>;
    constructor();
    enqueue(value: powerMatNode | null): void;
    dequeue(): powerMatNode | undefined;
    isEmpty(): boolean;
}
export { Queue };
