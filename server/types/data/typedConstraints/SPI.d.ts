import { PROTOCOL, POWER, net, voltage, result } from './PROTOCOL';
declare class SPI extends POWER implements PROTOCOL<SPI> {
    MISO: net;
    MOSI: net;
    SCK: net;
    arch: string | null;
    constructor(sourceVoltage: voltage);
    connect(childs: Array<SPI>): result<boolean>;
}
export { SPI };
