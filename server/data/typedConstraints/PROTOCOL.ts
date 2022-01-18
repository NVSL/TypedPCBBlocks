// Protocol Types
type net = boolean;

// Voltage
type range = { min: number; max: number };
interface voltage {
  io: 'out' | 'in' | null;
  isConnector: boolean; // TODO: Remove is Connector, then Only empty v1[] and a single or multiple v2s can be added to root.
  type: 'number' | 'range' | 'list' | null;
  value: number | range | Array<number> | null; // TODO: Remove lists? List of voltages ...what?
}

// Power variables
class POWER {
  netVoltage: number | null = null;
  sourceVoltage: voltage | null = null;
  constructor(sourceVoltage: voltage) {
    this.sourceVoltage = sourceVoltage;
  }
  public voltagesFit(v1: voltage, v2: voltage): boolean {
    let voltageOne: number | range | Array<number>;
    let voltageTwo: number | range | Array<number>;
    switch (v1.type) {
      case 'number':
        voltageOne = <number>v1.value;
        switch (v2.type) {
          case 'number':
            voltageTwo = <number>v2.value;
            if (voltageOne == voltageTwo) {
              // console.log(
              //   `CONNECTION VOLTAGES { ${voltageOne} , ${voltageTwo} } FIT`,
              //   'number, number',
              // );
              return true;
            }
            break;
          case 'range':
            voltageTwo = <range>v2.value;
            if (voltageOne >= voltageTwo.min && voltageOne <= voltageTwo.max) {
              // console.log(
              //   `CONNECTION VOLTAGES { ${voltageOne} , ${voltageTwo} } FIT`,
              //   'number, range',
              // );
              return true;
            }
            break;
          default:
            break;
        }
        break;
      case 'range':
        voltageOne = <range>v1.value;
        switch (v2.type) {
          case 'number':
            // A specific voltage should not be connected to range of voltage outputs.
            break;
          case 'range':
            voltageTwo = <range>v2.value;
            // voltages In ranges inside voltage Out ranges
            if (
              voltageTwo.min >= voltageOne.min &&
              voltageTwo.max <= voltageOne.max
            ) {
              // console.log(
              //   `CONNECTION VOLTAGES { ${voltageOne} , ${voltageTwo} } FIT`,
              //   'range, range',
              // );
              return true;
            }
            break;
          default:
            break;
        }
        break;
      default:
        break;
    }
    return false;
  }
}

// PROTOCOL base
interface PROTOCOL<T> {
  connect(childs: Array<T>): boolean;
}

export { PROTOCOL, POWER, net, voltage };
