import { PROTOCOL, POWER, voltage, result } from './PROTOCOL.js';
declare class GPIO extends POWER implements PROTOCOL<GPIO> {
    constructor(sourceVoltage: voltage);
    connect(childs: Array<GPIO>): result<boolean>;
}
export { GPIO };
