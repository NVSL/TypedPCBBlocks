declare type range = {
    min: number;
    max: number;
};
declare type typedYType = 'power' | 'protocol';
interface voltage {
    protocol: string;
    io: 'out' | 'in' | null;
    isConnector: boolean;
    type: 'number' | 'range' | 'list' | null;
    value: number | range | Array<number> | null;
}
interface TypedPower {
    type: typedYType;
    name: string | null;
    altname: string;
    required: boolean;
    typedNets: string[];
    vars: {
        voltage: voltage;
    };
}
interface TypedProtocol {
    type: typedYType;
    name: string | null;
    altname: string;
    required: boolean;
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
    eagleFileName: string;
    outputsPower: boolean;
    typedSchematic: TypedSchematic | null;
    inDesign: boolean;
    sourceVoltage: voltage | null;
    instance: number | null;
    constructor();
    loadTsch(eagleData: string, eagleFileName: string): Promise<void>;
    getTsch(): TypedSchematic | null;
    getVars(protocol: string): any;
    getVin(): voltage | null;
    getFileName(): string;
    getInstance(): number | null;
    getNets(protocol: string): Array<string>;
    getVouts(): voltage[];
    getVout(protocol: string): voltage | null;
    private getNetNames;
    private getTexts;
    private appendTypedProtocol;
    private parse;
    private checks;
}
export { TypedSchematic, tsch, voltage, range };
