import { tsch, voltage } from './tsch';
declare class powerMatNode {
    uuid: string;
    powerTsch: tsch;
    vin: voltage[];
    vout: voltage[];
    parent: powerMatNode | 'root' | null;
    children: Map<string, powerMatNode>;
    constructor(uuid: string, parent: powerMatNode | 'root' | null, powerTsch: tsch);
}
declare class powerMat {
    matsTree: powerMatNode | null;
    matsMap: Map<string, powerMatNode | undefined>;
    constructor();
    private testVoltages;
    addMat(parentUuid: string | 'root', mat: powerMatNode): boolean;
    newMat(powerTsch: tsch): powerMatNode | null;
    static isMat(tsch: tsch): boolean;
    private getRandomUuid;
}
export { powerMat };
