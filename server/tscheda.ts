import { tsch, voltage, range } from './tsch';

class powerMatNode {
  uuid: string;
  powerTsch: tsch;
  vin: voltage[];
  vout: voltage[];
  parent: powerMatNode | 'root' | null;
  children: Map<string, powerMatNode>;
  constructor(
    uuid: string,
    parent: powerMatNode | 'root' | null,
    powerTsch: tsch,
  ) {
    this.uuid = uuid;
    this.parent = parent;
    this.children = new Map();
    this.powerTsch = powerTsch;
    this.vin = powerTsch.getVin();
    this.vout = powerTsch.getVout();
  }
}

// Power cascade
class powerMat {
  matsTree: powerMatNode | null;
  matsMap: Map<string, powerMatNode | undefined>;
  constructor() {
    this.matsTree = null;
    this.matsMap = new Map();
  }

  private testVoltages(
    parentMat: powerMatNode,
    childMat: powerMatNode,
  ): boolean {
    if (childMat.vin.length == 0) {
      console.warn(
        'Power Mats with no voltage inputs can only be added to root',
      );
      return false;
    }

    if (childMat.vin.length > 1) {
      console.warn(
        'Power Mats can only have one voltage input, this has',
        childMat.vin.length,
      );
      return false;
    }

    if (parentMat.vout.length == 0) {
      console.error("Parent Power Mat doesn't have a vout:", parentMat);
      return false;
    }

    for (const vout of parentMat.vout) {
      const vin = childMat.vin[0];
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
                console.log('TEST VOLTAGES', true, 'number, number');
                return true;
              }
              break;
            case 'range':
              voltageIn = <range>vin.value;
              if (voltageOut >= voltageIn.min && voltageOut <= voltageIn.max) {
                console.log('TEST VOLTAGES', true, 'number, range');
                return true;
              }
              break;
            case 'list':
              voltageIn = <Array<number>>vin.value;
              for (const vi of voltageIn) {
                if (vi == voltageOut) {
                  console.log('TEST VOLTAGES', true, 'number, list');
                  return true;
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
                console.log('TEST VOLTAGES', true, 'range, range');
                return true;
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
                  console.log('TEST VOLTAGES', true, 'list, number');
                  return true;
                }
              }
              break;
            case 'range':
              voltageIn = <range>vin.value;
              // voltages ranges Overlap
              for (const vo of voltageOut) {
                if (vo >= voltageIn.min && vo <= voltageIn.max) {
                  console.log('TEST VOLTAGES', true, 'list, range');
                  return true;
                }
              }
              break;
            case 'list':
              for (const vo of voltageOut) {
                for (const vi of voltageOut) {
                  if (vo == vi) {
                    console.log('TEST VOLTAGES', true, 'list, list');
                    return true;
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
    return false;
  }

  public addMat(parentUuid: string | 'root', mat: powerMatNode): boolean {
    if (parentUuid == 'root') {
      if (this.matsTree == null) {
        // Store mat in Tree
        mat.parent = 'root';
        this.matsTree = mat;
        // Store mat in hashmap
        if (this.matsMap.has(this.matsTree.uuid)) {
          if (this.matsMap.get(this.matsTree.uuid) == undefined) {
            this.matsMap.set(this.matsTree.uuid, this.matsTree);
          } else {
            console.error('Power Mats Map alrady has', this.matsTree.uuid);
            return false;
          }
        } else {
          this.matsMap.set(this.matsTree.uuid, this.matsTree);
          return true;
        }
      } else {
        console.error('Power Mats Tree alrady has a root');
        return false;
      }
    } else {
      // Search for paernt
      let parentMat: powerMatNode | undefined;
      if (this.matsMap.has(parentUuid)) {
        parentMat = this.matsMap.get(parentUuid);
      } else {
        console.error('Parent uuid', parentUuid, 'not found');
        return false;
      }

      if (parentMat) {
        // Test Voltages ranges between parent Mat and new Mat
        if (!this.testVoltages(parentMat, mat)) {
          console.log(false, "TEST VOLTAGES: Voltages doesn't fit");
          return false;
        } else {
          console.log(true, 'TEST VOLTAGES: Fit');
        }

        if (parentMat.children.has(mat.uuid)) {
          // Add new Mat to parent
          console.error(
            'New Mat with uuid',
            mat.uuid,
            'already exists in parent Mat',
            parentMat.uuid,
          );
          return false;
        } else {
          // Store mat in Tree
          mat.parent = parentMat;
          parentMat.children.set(mat.uuid, mat);
          // Store mat in hashmap
          const newMat = parentMat.children.get(mat.uuid);
          if (newMat) {
            this.matsMap.set(mat.uuid, newMat);
            return true;
          } else {
            console.error('New Mat Uuid', mat.uuid, 'undefined');
            return false;
          }
        }
      } else {
        console.error('Parent Mat Uuid', parentUuid, 'undefined');
        return false;
      }
    }
    return false;
  }

  public newMat(powerTsch: tsch): powerMatNode | null {
    // Get a unique randomUuid and store it to hashmap as undefied
    let randomUuid = this.getRandomUuid();
    while (this.matsMap.has(randomUuid)) {
      randomUuid = this.getRandomUuid();
    }
    this.matsMap.set(randomUuid, undefined);

    // Return a powerMatNode if tsch outputs power
    if (powerMat.isMat(powerTsch))
      return new powerMatNode(randomUuid, null, powerTsch);
    else return null;
  }

  public static isMat(tsch: tsch): boolean {
    return tsch.outputsPower;
  }

  private getRandomUuid(): string {
    // Random 11 characters uuid
    const s: Array<string> = [];
    const hexDigits =
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const uuidLength = 11;
    for (var i = 0; i < uuidLength; i++) {
      s[i] = hexDigits.substr(Math.floor(Math.random() * hexDigits.length), 1);
    }
    const uuid = s.join('');
    return uuid;
  }
  // TODO: Check voltage structure, (add a new unique character? @ for voltage ?)
  // TODO: Add I2C and constrains
  // TODO: Definetely check or redo the visual blocks.
}

export { powerMat };

// class tschEDA {
//   constructor() {}
// }
