import { tsch } from './tsch';
declare class powerMatNode {
    uuid: string;
    parent: powerMatNode | 'root';
    children: Map<string, powerMatNode>;
    constructor(uuid: any, parent: any);
}
declare class powerMat {
    matsTree: powerMatNode | null;
    matsMap: Map<string, powerMatNode | undefined>;
    constructor();
    addMat(parentUuid: string, mat: powerMatNode): void;
    newMat(): powerMatNode;
    isMat(tsch: tsch): boolean;
    getRandomUuid(): string;
}
export { powerMat };
