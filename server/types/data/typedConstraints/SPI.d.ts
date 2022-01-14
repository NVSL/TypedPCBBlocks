import { PROTOCOL, POWER, net, voltage } from './PROTOCOL';
declare class SPI extends POWER implements PROTOCOL<SPI> {
    MISO: net;
    MOSI: net;
    SCK: net;
    arch: string | null;
    constructor(sourceVoltage: voltage);
    connect(childs: Array<SPI>): boolean;
}
export { SPI };
