import { PROTOCOL, POWER, PROPS, net } from './PROTOCOL';
declare class SPI extends POWER implements PROTOCOL<SPI> {
    MISO: net;
    MOSI: net;
    SCK: net;
    arch: string | null;
    constructor(props: PROPS);
    connect(childs: Array<SPI>): boolean;
}
export { SPI };
