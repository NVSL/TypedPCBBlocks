declare type net = boolean;
interface SPI {
    MISO: boolean;
    MOSI: boolean;
    SCK: boolean;
}
declare class POWER {
    netVoltage: number | null;
    sourceVoltage: number | null;
    constructor(props: PROPS);
}
interface PROPS {
    sourceVoltage: number;
}
declare class SPI extends POWER {
    MISO: net;
    MOSI: net;
    SCK: net;
    constructor(props: PROPS);
    connect(net2: SPI): boolean;
}
declare const jsonTypedTest: {
    MISO: boolean;
    MOSI: boolean;
    netVoltage: number;
};
declare const porps: PROPS;
declare const iface: SPI & {
    MISO: boolean;
    MOSI: boolean;
    netVoltage: number;
};
declare const jsonTypedSchematic: {
    "SPI-0": {
        ALTNAME: string;
        NET: string;
        SIGNAL: string;
        TYPE: string;
        VOLTAGE: string;
        VOLTAGE_LIST: string;
        VOLTAGE_RANGE: string;
    }[];
};
