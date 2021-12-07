import { tsch, voltage } from './tsch';
declare type voutIndex = number;
declare class powerMatNode {
    uuid: string;
    powerTsch: tsch;
    vin: voltage | null;
    vout: voltage[];
    propagVout: voltage[];
    parent: powerMatNode | 'root' | null;
    tschMap: Map<string, tsch>;
    children: Map<string, powerMatNode>;
    constructor(uuid: string, parent: powerMatNode | 'root' | null, powerTsch: tsch);
}
declare class powerMat {
    matsTree: powerMatNode | null;
    matsMap: Map<string, powerMatNode | undefined>;
    constructor();
    newMat(powerTsch: tsch): powerMatNode | null;
    static isMat(tsch: tsch): boolean;
    private testMatVoltages;
    addMat(parentUuid: string | 'root', mat: powerMatNode): boolean;
    private storeMatInTree;
    private storeMatInHashMap;
    private testTschVoltages;
    addTsch(matUuid: string, tsch: tsch): voutIndex;
    private getRandomUuid;
}
export { powerMat };
