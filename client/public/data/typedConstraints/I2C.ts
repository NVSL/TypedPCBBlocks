import {
  PROTOCOL,
  POWER,
  net,
  voltage,
  ok,
  error,
  result,
} from './PROTOCOL.js';

class I2C extends POWER implements PROTOCOL<I2C> {
  // Nets
  SDA: net = false;
  SCL: net = false;
  // Options
  arch: string | null = null;
  address: string | null = null;
  constructor(sourceVoltage: voltage) {
    super(sourceVoltage);
  }

  public connect(childs: Array<I2C>): result<boolean> {
    const parent = this;

    // ## Connection Constrains:
    for (const child of childs) {
      // The following nets must exist
      if (!(parent.SDA && parent.SCL && child.SDA && child.SCL)) {
        return error('Missing protocol nets');
      }

      // Net voltages must be equal
      if (parent.netVoltage) {
        if (!(parent.netVoltage == child.netVoltage)) {
          return error('Net voltages are not equal');
        }
      } else {
        // Net voltages same as Source voltages. Source voltages must fit
        if (parent.sourceVoltage && child.sourceVoltage) {
          if (!this.voltagesFit(parent.sourceVoltage, child.sourceVoltage)) {
            return error('Source voltages dont fit');
          }
        } else {
          return error('Source voltage not found');
        }
      }

      // Options
      if (parent.arch == null || child.arch == null) {
        console.warn('Unknown I2C master-slave architecture, doing nothing');
      } else {
        if (parent.arch == 'slave' && child.arch == 'master') {
          return error(
            `Connecting slave to master is currently not supprted. Try the other diection, master to slave`,
          );
        }
        if (!(parent.arch == 'master' && child.arch == 'slave')) {
          return error(
            `I2C parent and child architecture must be of type master-slave.`,
          );
        }
      }
    }

    // I2C Addresses must exists for childs
    let i2Caddresses: Array<string> = [];
    for (const child of childs) {
      if (child.address == null) {
        return error('I2C address must exists');
      } else {
        i2Caddresses.push(child.address);
      }
    }

    // I2C addresses must be unique
    const sortedAddr = i2Caddresses.sort();
    for (let i = 0; i < sortedAddr.length; i++) {
      if (sortedAddr[i + 1] != undefined) {
        if (sortedAddr[i] == sortedAddr[i + 1]) {
          return error(
            `I2C address must be unique, found two ${sortedAddr[i]} addresses`,
          );
        }
      }
    }
    // Connected :D
    return ok(true);
  }
}

export { I2C };
