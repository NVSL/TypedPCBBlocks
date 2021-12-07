import { tsch, voltage, range } from './tsch';

type voutIndex = number;

class powerMatNode {
  uuid: string;
  powerTsch: tsch;
  vin: voltage | null;
  vout: voltage[];
  propagVout: voltage[];
  parent: powerMatNode | 'root' | null;
  tschMap: Map<string, tsch>;
  children: Map<string, powerMatNode>;
  constructor(
    uuid: string,
    parent: powerMatNode | 'root' | null,
    powerTsch: tsch,
  ) {
    this.uuid = uuid;
    this.parent = parent;
    this.powerTsch = powerTsch;
    this.vin = powerTsch.getVin();
    this.vout = powerTsch.getVout();
    this.propagVout = [];
    this.tschMap = new Map();
    this.children = new Map();
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

  private testMatVoltages(
    parentMat: powerMatNode,
    childMat: powerMatNode,
  ): boolean {
    if (childMat.vin == null) {
      console.warn(
        'Power Mats with no voltage inputs can only be added to root',
      );
      return false;
    }

    if (parentMat.vout.length == 0) {
      console.error("Parent Power Mat doesn't have a vout:", parentMat);
      return false;
    }

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
        const childMat = this.storeMatInTree('root', mat);
        // Store mat in hashmap
        this.storeMatInHashMap(childMat);
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
        if (!this.testMatVoltages(parentMat, mat)) {
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
          const childMat = this.storeMatInTree(parentMat, mat);
          // Store mat in hashmap
          this.storeMatInHashMap(childMat);
        }
      } else {
        console.error('Parent Mat Uuid', parentUuid, 'undefined');
        return false;
      }
    }
    return false;
  }

  private storeMatInTree(
    parentMat: powerMatNode | 'root',
    childMat: powerMatNode,
  ): powerMatNode {
    if (parentMat == 'root') {
      // Store in Tree
      childMat.parent = 'root';
      this.matsTree = childMat;
    } else {
      // Store in Tree
      childMat.parent = parentMat;
      parentMat.children.set(childMat.uuid, childMat);
      // Propagate vout
      childMat.propagVout = [...childMat.vout];
      for (const vout of parentMat.vout) {
        childMat.propagVout.push(vout);
      }
    }
    return childMat;
  }

  private storeMatInHashMap(childMat: powerMatNode) {
    if (this.matsMap.has(childMat.uuid)) {
      if (this.matsMap.get(childMat.uuid) == undefined) {
        this.matsMap.set(childMat.uuid, childMat);
      } else {
        console.error('Power Mats Map alrady has', childMat.uuid);
        return false;
      }
    } else {
      this.matsMap.set(childMat.uuid, childMat);
      return true;
    }
  }

  private testTschVoltages(mat: powerMatNode, tsch: tsch): voutIndex {
    const vin = tsch.getVin();
    if (vin == null) {
      return -1;
    }

    for (const [voutIndex, vout] of Object.entries(mat.vout)) {
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
                return parseInt(voutIndex);
              }
              break;
            case 'range':
              voltageIn = <range>vin.value;
              if (voltageOut >= voltageIn.min && voltageOut <= voltageIn.max) {
                console.log('TEST VOLTAGES', true, 'number, range');
                return parseInt(voutIndex);
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
                console.log('TEST VOLTAGES', true, 'range, range');
                return parseInt(voutIndex);
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
    return -1;
  }

  // Asociates a tsch to a power mat
  // TODO: this must be outside in tschEDA to save tsch unique id
  // TODO: Add error handling inside a class
  // TODO: Add case for LED which doesn't have VIN
  public addTsch(matUuid: string, tsch: tsch): voutIndex {
    if (this.matsMap.has(matUuid)) {
      const mat = this.matsMap.get(matUuid);
      if (mat) {
        const voutIndex = this.testTschVoltages(mat, tsch);
        if (voutIndex >= 0) {
          // Add tsch to mat
          mat.tschMap.set(this.getRandomUuid(), tsch);
          return voutIndex;
        }
      }
    }
    return -1; // TODO:"Improve error handling
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
