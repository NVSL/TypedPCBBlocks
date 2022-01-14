declare type net = boolean;
declare type range = {
    min: number;
    max: number;
};
interface voltage {
    io: 'out' | 'in' | null;
    isConnector: boolean;
    type: 'number' | 'range' | 'list' | null;
    value: number | range | Array<number> | null;
}
declare class POWER {
    netVoltage: number | null;
    sourceVoltage: voltage | null;
    constructor(sourceVoltage: voltage);
    voltagesFit(v1: voltage, v2: voltage): boolean;
}
interface PROTOCOL<T> {
    connect(childs: Array<T>): boolean;
}
export { PROTOCOL, POWER, net, voltage };
