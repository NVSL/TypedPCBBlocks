import { tsch, voltage, TypedSchematic } from './tsch';
declare type uuid = string;
interface typedProtocol {
    uuid: uuid;
    protocol: string;
}
interface eagle {
    data: string;
    filename: string;
}
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
declare class tschEDA {
    tschs: Map<string, tsch>;
    matsMap: Map<string, powerMatNode | undefined>;
    matsTree: powerMatNode | null;
    connections: Map<typedProtocol, typedProtocol[]>;
    constructor();
    use(eagle: eagle): Promise<uuid>;
    newTsch(tsch: tsch): uuid;
    get(tschUuid: string): tsch | null;
    getTschSourceVoltage(tschUuid: string): voltage | null;
    isInDesing(tschUuid: string): boolean;
    isTsch(tschOrTschUuid: any): boolean;
    typedSch(tschUuid: uuid): TypedSchematic | null;
    typedSchVars(tschUuid: uuid, key: string): any | null;
    addTsch(matUuid: string, tschUuid: uuid): boolean;
    newMat(tschUuid: uuid): powerMatNode | null;
    getMat(matUuid: uuid): powerMatNode | null;
    getTschMat(tschUuid: string): powerMatNode | null;
    isMat(tschOrTschUuid: any): boolean;
    private testMatVoltages;
    addMat(parentUuid: string | 'root', mat: powerMatNode): boolean;
    private storeMatInTree;
    private storeMatInHashMap;
    private setInstance;
    private testTschVoltages;
    generateJson(): string;
    static getFriendlyName(protocol: string): string;
    static getWires(protocolFriedlyName: string, nets: Array<string>): Array<string>;
    private getRandomUuid;
    private loadConstrains;
    connect(parent: typedProtocol, childs: typedProtocol[]): Promise<boolean>;
    private addConnection;
    private protocolsAreEqual;
    private protocolListAreSame;
}
export { tschEDA };
