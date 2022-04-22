import {
  PROTOCOL,
  POWER,
  net,
  voltage,
  ok,
  error,
  result,
} from './PROTOCOL.js';

class SPI extends POWER implements PROTOCOL<SPI> {
  // Nets
  MISO: net = false;
  MOSI: net = false;
  SCK: net = false;
  // Options
  arch: string | null = null;
  constructor(sourceVoltage: voltage) {
    super(sourceVoltage);
  }

  public connect(childs: Array<SPI>): result<boolean> {
    const parent = this;

    // ## Connection Constrains:
    for (const child of childs) {
      // The following nets must exist
      if (
        !(
          parent.MISO &&
          parent.MOSI &&
          parent.SCK &&
          child.MISO &&
          child.MOSI &&
          child.SCK
        )
      ) {
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
        console.warn('Unknown SPI master-slave architecture, doing nothing');
      } else {
        if (parent.arch == 'slave' && child.arch == 'master') {
          return error(
            `Connecting slave to master is currently not supprted. Try the other diection, master to slave`,
          );
        }
        if (!(parent.arch == 'master' && child.arch == 'slave')) {
          return error(
            `SPI parent and child architecture must be of type master-slave. Parent arch:
            ${parent.arch} child arch:
            ${child.arch}`,
          );
        }
      }
    }

    // Connected :D
    return ok(true);
  }
}

export { SPI };
