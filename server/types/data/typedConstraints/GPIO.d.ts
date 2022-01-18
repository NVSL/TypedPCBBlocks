import { PROTOCOL, POWER, voltage } from './PROTOCOL';
declare class GPIO extends POWER implements PROTOCOL<GPIO> {
    constructor(sourceVoltage: voltage);
    connect(childs: Array<GPIO>): boolean;
}
export { GPIO };
