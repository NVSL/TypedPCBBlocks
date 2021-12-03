declare type range = {
    min: number;
    max: number;
};
declare type typedYType = 'power' | 'protocol';
interface voltage {
    io: 'out' | 'in' | null;
    isConnector: boolean;
    type: 'number' | 'range' | 'list' | null;
    value: number | range | Array<number> | null;
}
interface TypedPower {
    type: typedYType;
    name: string | null;
    altname: string;
    typedNets: string[];
    vars: {
        voltage: voltage;
    };
}
interface TypedProtocol {
    type: typedYType;
    name: string | null;
    altname: string;
    typedNets: string[];
    vars: {
        [props: string]: string | number | boolean;
    };
}
interface TypedSchematic {
    [protocolKey: string]: TypedProtocol | TypedPower;
}
declare class tsch {
    eagle: any;
    eagleVersion: string | null;
    outputsPower: boolean;
    typedSchematic: TypedSchematic | null;
    constructor();
    loadTsch(eagleData: string): Promise<void>;
    getTsch(): TypedSchematic | null;
    getVars(protocolKey: string): any;
    getVin(): voltage[];
    getVout(): voltage[];
    private getNetNames;
    private getTexts;
    private appendTypedProtocol;
    private parse;
    static areEqual(protocolOne: string, protocolTwo: string): boolean;
    static getProtocolName(protocolAndAltnameList: string[]): string | null;
}
export { TypedSchematic, tsch, voltage, range };
