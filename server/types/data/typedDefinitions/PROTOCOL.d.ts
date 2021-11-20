declare type net = boolean;
interface PROPS {
    sourceVoltage: number;
}
declare class POWER {
    netVoltage: number | null;
    sourceVoltage: number | null;
    constructor(props: PROPS);
}
interface PROTOCOL<T> {
    connect(net: T): boolean;
}
export { PROTOCOL, POWER, PROPS, net };
