import { PROTOCOL, POWER, PROPS, net } from './PROTOCOL';
declare class SPI extends POWER implements PROTOCOL<SPI> {
    MISO: net;
    MOSI: net;
    SCK: net;
    constructor(props: PROPS);
    connect(childs: any): boolean;
}
export { SPI };
