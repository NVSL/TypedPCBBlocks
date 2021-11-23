interface TypedProtocol {
    protocol: string | null;
    altname: string;
    typedNets: string[];
    vars: {
        [props: string]: string | number | boolean;
    };
}
interface TypedSchematic {
    [protocolKey: string]: TypedProtocol;
}
declare class tsch {
    eagle: any;
    eagleVersion: string | null;
    typedSchematic: TypedSchematic | null;
    constructor();
    loadTsch(eagleData: string): Promise<void>;
    getTsch(): TypedSchematic;
    getVars(protocolKey: string): any;
    private getNetNames;
    private appendTypedProtocol;
    private parse;
    static areEqual(protocolOne: string, protocolTwo: string): boolean;
    static getProtocolName(protocolAndAltnameList: string[]): string | null;
}
export { TypedSchematic, tsch };
