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
declare type result<T> = [res: T | null, err: string | null];
declare const ok: <T>(res: T) => result<T>;
declare const error: (msg: string) => result<null>;
interface PROTOCOL<T> {
    connect(childs: Array<T>): result<boolean>;
}
export { PROTOCOL, POWER, net, voltage, ok, error, result };
