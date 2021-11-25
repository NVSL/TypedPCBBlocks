declare class powerMatNode {
    tschName: string;
    tschCtr: number;
    matsCtr: number;
    parent: powerMatNode | string;
    children: Map<string, powerMatNode>;
    constructor(tschName: any, parent: any);
}
declare class powerMat {
    powerMats: powerMatNode | null;
    constructor();
    addMat(tschName: string): void;
}
export { powerMat };
