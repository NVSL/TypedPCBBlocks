import { PROPS } from './data/typedDefinitions/PROTOCOL';
import { tsch, voltage, TypedSchematic } from './tsch';
declare type voutIndex = number;
declare type uuid = string;
interface typedProtocol {
    uuid: uuid;
    protocol: string;
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
    use(eagleFile: string): Promise<uuid>;
    newTsch(tsch: tsch): uuid;
    get(uuid: string): tsch | null;
    isTsch(tschOrUuid: any): boolean;
    typedSch(uuid: uuid): TypedSchematic | null;
    typedSchVars(uuid: uuid, key: string): any | null;
    addTschToMat(matUuid: string, tschUuid: uuid): voutIndex;
    newMat(powerTschUuid: uuid): powerMatNode | null;
    getMat(uuid: uuid): powerMatNode | null;
    isMat(tschOrUuid: any): boolean;
    private testMatVoltages;
    addMat(parentUuid: string | 'root', mat: powerMatNode): boolean;
    private storeMatInTree;
    private storeMatInHashMap;
    private testTschVoltages;
    private getRandomUuid;
    private loadConstrains;
    connect(props: PROPS, parent: typedProtocol, childs: typedProtocol[]): Promise<boolean>;
    private addConnection;
    private protocolsAreEqual;
    private protocolListAreSame;
}
export { tschEDA };
