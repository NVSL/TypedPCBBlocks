import { POWER, ok, error } from './PROTOCOL.js';
class GPIO extends POWER {
    constructor(sourceVoltage) {
        super(sourceVoltage);
    }
    connect(childs) {
        const parent = this;
        // ## Connection Constrains:
        for (const child of childs) {
            // Net voltages must be equal
            if (parent.netVoltage) {
                if (!(parent.netVoltage == child.netVoltage)) {
                    return error('Net voltages are not equal');
                }
            }
            else {
                // Net voltages same as Source voltages. Source voltages must fit
                if (parent.sourceVoltage && child.sourceVoltage) {
                    if (!this.voltagesFit(parent.sourceVoltage, child.sourceVoltage)) {
                        return error('Source voltages dont fit');
                    }
                }
                else {
                    return error('Source voltage not found');
                }
            }
        }
        // Connected :D
        return ok(true);
    }
}
export { GPIO };
