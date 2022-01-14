import { powerMatNode } from './tscheda';
import { tsch, range } from './tsch';

const test = {
  tschVoltages: (
    mat: powerMatNode,
    tsch: tsch,
  ): { voutProtocol: string; vinProtocol: string } | null => {
    const vin = tsch.getVin();
    if (vin == null) {
      return null;
    }

    for (const vout of Object.values(mat.vout)) {
      let voltageOut: number | range | Array<number>;
      let voltageIn: number | range | Array<number>;
      console.log('TEST VOLTAGES', vout.value, vin.value);
      switch (vout.type) {
        case 'number':
          voltageOut = <number>vout.value;
          switch (vin.type) {
            case 'number':
              voltageIn = <number>vin.value;
              if (voltageOut == voltageIn) {
                console.log(
                  'TEST VOLTAGES',
                  {
                    voutProtocol: vout.protocol,
                    vinProtocol: vin.protocol,
                  },
                  'number, number',
                );
                return {
                  voutProtocol: vout.protocol,
                  vinProtocol: vin.protocol,
                };
              }
              break;
            case 'range':
              voltageIn = <range>vin.value;
              if (voltageOut >= voltageIn.min && voltageOut <= voltageIn.max) {
                console.log(
                  'TEST VOLTAGES',
                  {
                    voutProtocol: vout.protocol,
                    vinProtocol: vin.protocol,
                  },
                  'number, range',
                );
                return {
                  voutProtocol: vout.protocol,
                  vinProtocol: vin.protocol,
                };
              }
              break;
            default:
              break;
          }
          break;
        case 'range':
          voltageOut = <range>vout.value;
          switch (vin.type) {
            case 'number':
              // A specific voltage should not be connected to range of voltage outputs.
              break;
            case 'range':
              voltageIn = <range>vin.value;
              // voltages In ranges inside voltage Out ranges
              if (
                voltageIn.min >= voltageOut.min &&
                voltageIn.max <= voltageOut.max
              ) {
                console.log(
                  'TEST VOLTAGES',
                  {
                    voutProtocol: vout.protocol,
                    vinProtocol: vin.protocol,
                  },
                  'range, range',
                );
                return {
                  voutProtocol: vout.protocol,
                  vinProtocol: vin.protocol,
                };
              }
              break;
            default:
              break;
          }
          break;
        default:
          break;
      }
    }
    return null;
  },

  matVoltages: (
    parentMat: powerMatNode,
    childMat: powerMatNode,
  ): { voutProtocol: string; vinProtocol: string } | null => {
    if (childMat.vin == null) {
      console.warn(
        'Power Mats with no voltage inputs can only be added to root',
      );
      return null;
    }

    if (parentMat.vout.length == 0) {
      console.error("Parent Power Mat doesn't have a vout:", parentMat);
      return null;
    }

    // for (const [voutIndex, vout] of Object.entries(mat.vout)) {
    for (const vout of parentMat.vout) {
      const vin = childMat.vin;
      let voltageOut: number | range | Array<number>;
      let voltageIn: number | range | Array<number>;
      console.log('TEST VOLTAGES', vout.value, vin.value);
      switch (vout.type) {
        case 'number':
          voltageOut = <number>vout.value;
          switch (vin.type) {
            case 'number':
              voltageIn = <number>vin.value;
              if (voltageOut == voltageIn) {
                console.log(
                  'TEST VOLTAGES',
                  { voutProtocol: vout.protocol, vinProtocol: vin.protocol },
                  'number, number',
                );
                return {
                  voutProtocol: vout.protocol,
                  vinProtocol: vin.protocol,
                };
              }
              break;
            case 'range':
              voltageIn = <range>vin.value;
              if (voltageOut >= voltageIn.min && voltageOut <= voltageIn.max) {
                console.log(
                  'TEST VOLTAGES',
                  {
                    voutProtocol: vout.protocol,
                    vinProtocol: vin.protocol,
                  },
                  'number, range',
                );
                return {
                  voutProtocol: vout.protocol,
                  vinProtocol: vin.protocol,
                };
              }
              break;
            case 'list':
              voltageIn = <Array<number>>vin.value;
              for (const vi of voltageIn) {
                if (vi == voltageOut) {
                  console.log(
                    'TEST VOLTAGES',
                    {
                      voutProtocol: vout.protocol,
                      vinProtocol: vin.protocol,
                    },
                    'number, list',
                  );
                  return {
                    voutProtocol: vout.protocol,
                    vinProtocol: vin.protocol,
                  };
                }
              }
              break;
            default:
              break;
          }
          break;
        case 'range':
          voltageOut = <range>vout.value;
          switch (vin.type) {
            case 'number':
              // voltageIn = <number>vin.value;
              // if (voltageOut.min >= voltageIn && voltageOut.max <= voltageIn) {
              //   return true;
              // }
              console.warn(
                'A specific voltage should not be connected to range of voltage outputs.',
              );
              break;
            case 'range':
              voltageIn = <range>vin.value;
              // voltages ranges Overlap
              if (
                voltageIn.min <= voltageOut.max &&
                voltageOut.min <= voltageIn.max
              ) {
                console.log(
                  'TEST VOLTAGES',
                  {
                    voutProtocol: vout.protocol,
                    vinProtocol: vin.protocol,
                  },
                  'range, range',
                );
                return {
                  voutProtocol: vout.protocol,
                  vinProtocol: vin.protocol,
                };
              }
              break;
            case 'list':
              console.warn(
                'List of voltages Inputs should not be connected to range of voltage Outputs.',
              );
              break;
            default:
              break;
          }
          break;
        case 'list':
          voltageOut = <Array<number>>vout.value;
          switch (vin.type) {
            case 'number':
              voltageIn = <number>vin.value;
              for (const vo of voltageOut) {
                if (vo == voltageIn) {
                  console.log(
                    'TEST VOLTAGES',
                    {
                      voutProtocol: vout.protocol,
                      vinProtocol: vin.protocol,
                    },
                    'list, number',
                  );
                  return {
                    voutProtocol: vout.protocol,
                    vinProtocol: vin.protocol,
                  };
                }
              }
              break;
            case 'range':
              voltageIn = <range>vin.value;
              // voltages ranges Overlap
              for (const vo of voltageOut) {
                if (vo >= voltageIn.min && vo <= voltageIn.max) {
                  console.log(
                    'TEST VOLTAGES',
                    {
                      voutProtocol: vout.protocol,
                      vinProtocol: vin.protocol,
                    },
                    'list, range',
                  );
                  return {
                    voutProtocol: vout.protocol,
                    vinProtocol: vin.protocol,
                  };
                }
              }
              break;
            case 'list':
              for (const vo of voltageOut) {
                for (const vi of voltageOut) {
                  if (vo == vi) {
                    console.log(
                      'TEST VOLTAGES',
                      {
                        voutProtocol: vout.protocol,
                        vinProtocol: vin.protocol,
                      },
                      'list, list',
                    );
                    return {
                      voutProtocol: vout.protocol,
                      vinProtocol: vin.protocol,
                    };
                  }
                }
              }
              break;
            default:
              break;
          }
          break;
        default:
          break;
      }
    }
    return null;
  },
};

export { test };
