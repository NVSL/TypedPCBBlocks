declare class powerMatNode {
    uuid: string;
    parent: powerMatNode | 'root';
    children: Map<string, powerMatNode>;
    constructor(uuid: any, parent: any);
}
declare class powerMat {
    matsTree: powerMatNode | null;
    matsMap: Map<string, powerMatNode>;
    constructor();
    addMatIn(parentUuid: string, mat: powerMatNode): void;
    newMat(): powerMatNode;
    getRandomUuid(): string;
}
export { powerMat };
