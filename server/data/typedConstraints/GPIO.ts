import { PROTOCOL, POWER, voltage } from './PROTOCOL';

class GPIO extends POWER implements PROTOCOL<GPIO> {
  constructor(sourceVoltage: voltage) {
    super(sourceVoltage);
  }
  public connect(childs: Array<GPIO>): boolean {
    const parent = this;

    // ## Connection Constrains:
    for (const child of childs) {
      // Net voltages must be equal
      if (parent.netVoltage) {
        if (!(parent.netVoltage == child.netVoltage)) {
          console.error('Net voltages are not equal');
          return false;
        }
      } else {
        // Net voltages same as Source voltages. Source voltages must fit
        if (parent.sourceVoltage && child.sourceVoltage) {
          if (!this.voltagesFit(parent.sourceVoltage, child.sourceVoltage)) {
            console.error('Source voltages dont fit');
            return false;
          }
        } else {
          console.error('Source voltage not found');
          return false;
        }
      }
    }

    // Connected :D
    return true;
  }
}

export { GPIO };
