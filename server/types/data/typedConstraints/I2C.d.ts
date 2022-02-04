import { PROTOCOL, POWER, net, voltage, result } from './PROTOCOL.js';
declare class I2C extends POWER implements PROTOCOL<I2C> {
    SDA: net;
    SCL: net;
    arch: string | null;
    address: string | null;
    constructor(sourceVoltage: voltage);
    connect(childs: Array<I2C>): result<boolean>;
}
export { I2C };
