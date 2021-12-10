import { PROPS } from './data/typedDefinitions/PROTOCOL'; // TODO: Add as a package
import { tsch, voltage, range, TypedSchematic } from './tsch';

type voutIndex = number;
type uuid = string;

interface typedProtocol {
  uuid: uuid;
  protocol: string;
}

// TODO: Move powerMat and powerMat node to another file
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
class tschEDA {
  tschs: Map<string, tsch>;
  matsMap: Map<string, powerMatNode | undefined>;
  matsTree: powerMatNode | null;
  connections: Map<typedProtocol, typedProtocol[]>;
  constructor() {
    this.tschs = new Map();
    this.matsMap = new Map();
    this.matsTree = null;
    this.connections = new Map();
  }

  ///// TSCHS

  public async use(eagleFile: string): Promise<uuid> {
    const Tsch = new tsch();
    await Tsch.loadTsch(eagleFile);
    return this.newTsch(Tsch);
  }

  public newTsch(tsch: tsch): uuid {
    // Generate new ID
    let randomUuid = this.getRandomUuid();
    while (this.tschs.has(randomUuid)) {
      randomUuid = this.getRandomUuid();
    }
    this.tschs.set(randomUuid, tsch);
    return randomUuid;
  }

  public get(uuid: string): tsch | null {
    if (this.tschs.has(uuid)) {
      const Tsch = this.tschs.get(uuid);
      if (Tsch) return Tsch;
      else return null;
    }
    return null;
  }

  public isTsch(tschOrUuid: any): boolean {
    if (typeof tschOrUuid === 'string') {
      if (this.get(tschOrUuid)) {
        return true;
      }
    }

    if (tschOrUuid.eagle !== undefined) {
      return true;
    }

    return false;
  }

  public typedSch(uuid: uuid): TypedSchematic | null {
    const Tsch = this.get(uuid);
    if (Tsch) {
      return Tsch.typedSchematic;
    }
    return null;
  }

  public typedSchVars(uuid: uuid, key: string): any | null {
    const Tsch = this.get(uuid);
    if (Tsch) {
      return Tsch.getVars(key);
    }
    return null;
  }

  // Asociates a tsch to a power mat
  // TODO: this must be outside in tschEDA to save tsch unique id
  // TODO: Add error handling inside a class
  // TODO: Add case for LED which doesn't have VIN
  public addTschToMat(matUuid: string, tschUuid: uuid): voutIndex {
    const Tsch = this.get(tschUuid);
    if (Tsch) {
      const Mat = this.getMat(matUuid);
      if (Mat) {
        const voutIndex = this.testTschVoltages(Mat, Tsch);
        if (voutIndex >= 0) {
          // Add tsch to mat
          Mat.tschMap.set(this.getRandomUuid(), Tsch);
          return voutIndex;
        }
      }
    }
    return -1; // TODO:"Improve error handling
  }

  //// POWER MATS

  // TODO: Use should automatically create mat if tsch is mat?
  public newMat(powerTschUuid: uuid): powerMatNode | null {
    if (this.isMat(powerTschUuid)) {
      const powerTsch = this.get(powerTschUuid);
      if (powerTsch) {
        // Get a unique randomUuid and store it to hashmap as undefied
        let randomUuid = this.getRandomUuid();
        while (this.matsMap.has(randomUuid)) {
          randomUuid = this.getRandomUuid();
        }
        this.matsMap.set(randomUuid, undefined);

        // Return a powerMatNode
        return new powerMatNode(randomUuid, null, powerTsch);
      }
    }
    return null;
  }

  public getMat(uuid: uuid): powerMatNode | null {
    if (this.matsMap.has(uuid)) {
      const mat = this.matsMap.get(uuid);
      if (mat) return mat;
      else return null;
    }
    return null;
  }

  public isMat(tschOrUuid: any): boolean {
    // is Tsch
    if (this.isTsch(tschOrUuid)) {
      if ((<tsch>tschOrUuid).outputsPower) {
        return true;
      }
    }

    // is uuid
    if (typeof tschOrUuid === 'string') {
      const tsch = this.get(tschOrUuid);
      if (tsch) {
        if (tsch.outputsPower) {
          return true;
        }
      }
    }

    return false;
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

  ///// Constrain connectins

  private loadConstrains(protocol: any, typedJson: any) {
    const loadedProtocol = Object.assign(protocol, typedJson);
    return loadedProtocol;
  }

  // TODO: Add a check if tsch's are on design or not
  public async connect(
    props: PROPS,
    parent: typedProtocol,
    childs: typedProtocol[],
  ): Promise<boolean> {
    const path = './data/typedDefinitions/'; // TODO: Add when class tschEDA is created
    // Checks
    if (childs.length < 1) {
      console.error('Typed Schematic child list must be greater than one');
      return false;
    }
    // TODO: Must check if TSCH is in design or not
    // TODO: Maybe check if typed protocols Constranis exists (Must load when new tschEDA)

    // Check: Only protocols or the same type can be connected
    const protocolName = this.protocolListAreSame(parent, childs);
    if (protocolName == null) {
      console.error('Protocol Names are not equal', protocolName);
      return false;
    }

    try {
      // Dynamically import protcol class
      const protocolClass = await import(path + protocolName);
      console.log(protocolClass);

      // Load tsch Parent Class
      const tschClassParent: typeof protocolClass = this.loadConstrains(
        new protocolClass[protocolName](props),
        this.typedSchVars(parent.uuid, parent.protocol),
      );
      console.log('PARENT >> \n', tschClassParent);

      // Load tsch Childs Class
      const tschClassChilds: typeof protocolClass = [];
      for (const child of childs) {
        const tschClass = this.loadConstrains(
          new protocolClass[protocolName](props),
          this.typedSchVars(child.uuid, child.protocol),
        );
        tschClassChilds.push(tschClass);
        console.log('CHILD >> \n', tschClass);
      }

      // Connect:
      const result = tschClassParent.connect(tschClassChilds);
      if (result) {
        this.addConnection(parent, childs);
        return true;
      } else {
        return false;
      }
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  private addConnection(parent: typedProtocol, childs: typedProtocol[]) {
    this.connections.set(parent, childs);
  }

  // Two protocols are equal
  // Input example: GPIO, GPIO
  // Output: true
  private protocolsAreEqual(protocolOne: string, protocolTwo: string): boolean {
    if (protocolOne.split('-')[0] === protocolTwo.split('-')[0]) {
      return true;
    } else {
      return false;
    }
  }

  // Checks that all protocols in array are the same, if are, returns friendly name
  // Input example: [GPIO-1, GPIO-0, GPIO-RESET]
  // Return examples: GPIO
  private protocolListAreSame(
    parent: typedProtocol,
    childs: typedProtocol[],
  ): string | null {
    const protocolAndAltnameList = [parent.protocol].concat(
      childs.map((e) => {
        return e.protocol;
      }),
    );

    if (protocolAndAltnameList.length == 0) {
      console.warn('Protocol and Altname List is zero');
      return null;
    } else {
      const protocolName = protocolAndAltnameList[0].split('-')[0];
      if (protocolAndAltnameList.length == 1) {
        return protocolAndAltnameList[0].split('-')[0];
      } else {
        for (const name of protocolAndAltnameList) {
          if (!this.protocolsAreEqual(protocolName, name)) {
            console.warn(
              'Protocol and Altname List names are not equal:',
              protocolAndAltnameList,
            );
            return null;
          }
        }
        return protocolName;
      }
    }
  }
}

export { tschEDA };

// class tschEDA {
//   constructor() {}
// }
