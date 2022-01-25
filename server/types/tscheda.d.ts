import { MultiMap } from './utils';
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
    connections: MultiMap<typedProtocol, typedProtocol[]>;
    typedConstraintsPath: string;
    constructor(typedConstrainsPath: any);
    use(eagle: eagle): Promise<uuid>;
    newTsch(tsch: tsch): uuid;
    getTsch(tschUuid: string): tsch | null;
    getTschSourceVoltage(tschUuid: string): voltage | null;
    isInDesing(tschUuid: string): boolean;
    isTsch(tschOrTschUuid: any): boolean;
    typedSch(tschUuid: uuid): TypedSchematic | null;
    typedSchVars(tschUuid: uuid, key: string): any | null;
    addTsch(matUuid: string, tschUuid: uuid): void;
    newMat(tschUuid: uuid): string;
    getMat(matUuid: uuid): powerMatNode | null;
    getTschMat(tschUuid: string): powerMatNode | null;
    isMat(matOrMatUuid: any): boolean;
    tschOutputsPower(tschOrTschUuid: any): boolean;
    addMat(parentUuid: string | 'root', childMatUuid: string): void;
    private storeMatInTree;
    private storeMatInHashMap;
    private setInstance;
    private generateNetConnections;
    checkRequiredConnections(): void;
    drc(): void;
    generateJson(): string;
    static getFriendlyName(protocol: string): string;
    static getSubWires(protocolFriedlyName: string, nets: Array<string>): Array<string>;
    private getRandomUuid;
    private treeBFS;
    private loadConstrains;
    connect(parent: typedProtocol, childs: typedProtocol[]): Promise<void>;
    private addConnection;
    private protocolsAreEqual;
    private protocolListAreSame;
}
export { tschEDA, powerMatNode };
