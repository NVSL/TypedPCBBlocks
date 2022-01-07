import { tsch, voltage, range, TypedSchematic } from './tsch';

type voutIndex = number;
type uuid = string;

interface connectionOutputFormat {
  type: string;
  connect: Array<{
    schematic: string;
    instance: number;
    nets: Array<string>;
  }>;
}

interface typedProtocol {
  uuid: uuid;
  protocol: string;
}

interface eagle {
  data: string;
  filename: string;
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

  public async use(eagle: eagle): Promise<uuid> {
    const Tsch = new tsch();
    await Tsch.loadTsch(eagle.data, eagle.filename);
    return this.newTsch(Tsch);
  }

  public newTsch(tsch: tsch): uuid {
    // Generate new ID
    let randomUuid = this.getRandomUuid();
    while (this.tschs.has(randomUuid)) {
      randomUuid = this.getRandomUuid();
    }
    this.tschs.set(randomUuid, tsch);
    // Update tsch instance number
    this.setInstance(tsch);
    return randomUuid;
  }

  public get(tschUuid: string): tsch | null {
    if (this.tschs.has(tschUuid)) {
      const Tsch = this.tschs.get(tschUuid);
      if (Tsch) return Tsch;
      else return null;
    }
    return null;
  }

  public getTschSourceVoltage(tschUuid: string): voltage | null {
    const Tsch = this.get(tschUuid);
    if (Tsch) {
      return Tsch.sourceVoltage;
    }
    return null;
  }

  public isInDesing(tschUuid: string): boolean {
    const Tsch = this.get(tschUuid);
    if (Tsch) {
      return Tsch.inDesign;
    }
    return false;
  }

  public isTsch(tschOrTschUuid: any): boolean {
    if (typeof tschOrTschUuid === 'string') {
      if (this.get(tschOrTschUuid)) {
        return true;
      }
    }

    if (tschOrTschUuid.eagle !== undefined) {
      return true;
    }

    return false;
  }

  public typedSch(tschUuid: uuid): TypedSchematic | null {
    const Tsch = this.get(tschUuid);
    if (Tsch) {
      return Tsch.typedSchematic;
    }
    return null;
  }

  public typedSchVars(tschUuid: uuid, key: string): any | null {
    const Tsch = this.get(tschUuid);
    if (Tsch) {
      return Tsch.getVars(key);
    }
    return null;
  }

  // Asociates a tsch to a power mat
  // TODO: Add error handling inside a class
  // TODO: Add case for LED which doesn't have VIN
  public addTsch(matUuid: string, tschUuid: uuid): boolean {
    const Tsch = this.get(tschUuid);
    if (!Tsch) return false;
    const Mat = this.getMat(matUuid);
    if (!Mat) return false;

    const voutIndex = this.testTschVoltages(Mat, Tsch);
    if (voutIndex >= 0) {
      // Add tsch to mat
      Mat.tschMap.set(this.getRandomUuid(), Tsch);
      Tsch.inDesign = true;
      // Set Tsch inDesignVout
      Tsch.sourceVoltage = Mat.vout[voutIndex];
      return true;
    }
    return false; // TODO:"Improve error handling
  }

  //// POWER MATS

  // TODO: Use should automatically create mat if tsch is mat?
  public newMat(tschUuid: uuid): powerMatNode | null {
    if (this.isMat(tschUuid)) {
      const powerTsch = this.get(tschUuid);
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

  public getMat(matUuid: uuid): powerMatNode | null {
    if (this.matsMap.has(matUuid)) {
      const mat = this.matsMap.get(matUuid);
      if (mat) return mat;
      else return null;
    }
    return null;
  }

  public getTschMat(tschUuid: string): powerMatNode | null {
    if (this.isInDesing(tschUuid)) {
      for (const Mat of this.matsMap.values()) {
        if (Mat) {
          for (const tschUuidInMat of Mat.tschMap.keys()) {
            if (tschUuidInMat == tschUuid) {
              return Mat;
            }
          }
        }
      }
    }
    return null;
  }

  public isMat(tschOrTschUuid: any): boolean {
    // is Tsch
    if (this.isTsch(tschOrTschUuid)) {
      if ((<tsch>tschOrTschUuid).outputsPower) {
        return true;
      }
    }

    // is uuid
    if (typeof tschOrTschUuid === 'string') {
      const tsch = this.get(tschOrTschUuid);
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
        // Set in design
        childMat.powerTsch.inDesign = true;
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
          // Set in design
          childMat.powerTsch.inDesign = true;
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

  private setInstance(tsch: tsch) {
    let instanceCounter = 0;
    if (this.isTsch(tsch)) {
      for (const storedTsch of this.tschs.values()) {
        if (storedTsch) {
          if (tsch.eagleFileName == storedTsch.eagleFileName) {
            instanceCounter++;
          }
        }
      }
      tsch.instance = instanceCounter;
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

  // Generate connections list in JSON format
  public generateJson(): any {
    const outputFormat: Array<connectionOutputFormat> = [];
    if (this.connections.size > 0) {
      for (const [key, val] of this.connections.entries()) {
        const tsch = this.get(key.uuid);
        console.log(tsch!.typedSchematic);
        // const format: connectionOutputFormat = {
        //   type: tschEDA.getFriendlyName(key.protocol),
        //   connect: []
        // }
        // format.connect.push({schematic: tsch!.getFileName(), instance: tsch!.getInstance()!, net: })
        // outputFormat.push{
        // }
      }
    }
  }

  public static getFriendlyName(protocol: string): string {
    const friendlyName = protocol.split('-')[0];
    return friendlyName ? friendlyName : '';
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

  public async connect(
    parent: typedProtocol,
    childs: typedProtocol[],
  ): Promise<boolean> {
    const path = './data/typedDefinitions/'; // TODO: Add when class tschEDA is created
    // Checks
    if (childs.length < 1) {
      console.error('Typed Schematic child list must be greater than one');
      return false;
    }
    // Check if parent TSCH and child TSCHs are in design
    if (!this.isInDesing(parent.uuid)) return false;
    for (const child of childs) {
      if (!this.isInDesing(child.uuid)) return false;
    }

    // TODO: Maybe check if typed protocols Constranis file exists (Must load when new tschEDA)

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
      const parentSourceVoltage = this.getTschSourceVoltage(parent.uuid);
      const tschClassParent: typeof protocolClass = this.loadConstrains(
        new protocolClass[protocolName](parentSourceVoltage),
        this.typedSchVars(parent.uuid, parent.protocol),
      );
      console.log('PARENT >> \n', tschClassParent);

      // Load tsch Childs Class
      const tschClassChilds: typeof protocolClass = [];
      for (const child of childs) {
        const childSourceVoltage = this.getTschSourceVoltage(parent.uuid);
        const tschClass = this.loadConstrains(
          new protocolClass[protocolName](childSourceVoltage),
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
