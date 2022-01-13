import { json } from 'stream/consumers';
import { Queue } from './utils';
import { tsch, voltage, range, TypedSchematic } from './tsch';
import { PROTOCOL } from './data/typedDefinitions/PROTOCOL';
import { version } from 'os';
import { parse } from 'path/posix';

type voutIndex = number;
type uuid = string;

type connect = {
  schematic: string;
  instance: number;
  net: string;
};
interface connectionOutputFormat {
  type: string;
  wire: string;
  connect: Array<connect>;
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
    this.vout = powerTsch.getVouts();
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
  connections: Map<string, typedProtocol[]>;
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

    const vResult: {
      voutProtocol: string;
      vinProtocol: string;
    } | null = this.testTschVoltages(Mat, Tsch);
    if (vResult != null) {
      // Add tsch to mat
      Mat.tschMap.set(this.getRandomUuid(), Tsch);
      Tsch.inDesign = true;
      // Set Tsch inDesignVout
      const res = Mat.powerTsch.getVars(vResult.voutProtocol);
      Tsch.sourceVoltage = Mat.powerTsch.getVout(vResult.voutProtocol);
      // Add connection
      const key: typedProtocol = {
        uuid: matUuid,
        protocol: vResult.voutProtocol,
      };
      const data: typedProtocol = {
        uuid: tschUuid,
        protocol: vResult.vinProtocol,
      };

      this.addConnection(key, [data]);

      console.log('*** New Mat/Tsch Connection', this.connections);
      return true;
    }
    return false; // TODO:"Improve error handling
  }

  //// POWER MATS

  // TODO: Use should automatically create mat if tsch is mat?
  public newMat(tschUuid: uuid): powerMatNode | null {
    if (this.tschOutputsPower(tschUuid)) {
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

  public isMat(matOrMatUuid: any): boolean {
    // is uuid
    if (typeof matOrMatUuid === 'string') {
      const mat = this.getMat(matOrMatUuid);
      if (mat) {
        return true;
      }
    }

    // is mat
    if ((<powerMatNode>matOrMatUuid).powerTsch) {
      return true;
    }

    return false;
  }

  public tschOutputsPower(tschOrTschUuid: any) {
    // is uuid
    if (typeof tschOrTschUuid === 'string') {
      const tsch = this.get(tschOrTschUuid);
      if (tsch) {
        if (tsch.outputsPower) {
          return true;
        }
      }
    }

    // is Tsch
    if (this.isTsch(tschOrTschUuid)) {
      if ((<tsch>tschOrTschUuid).outputsPower) {
        return true;
      }
    }

    return false;
  }

  // TODO: This must return VOUT-X connected to what VIN so we can add the connections
  // TODO: Remove Bread first search
  private testMatVoltages(
    parentMat: powerMatNode,
    childMat: powerMatNode,
  ): { voutProtocol: string; vinProtocol: string } | null {
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
        const vResult: {
          voutProtocol: string;
          vinProtocol: string;
        } | null = this.testMatVoltages(parentMat, mat);
        if (vResult == null) {
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
          // Add connection
          const key: typedProtocol = {
            uuid: parentUuid,
            protocol: vResult.voutProtocol,
          };
          const data: typedProtocol = {
            uuid: mat.uuid,
            protocol: vResult.vinProtocol,
          };

          this.addConnection(key, [data]);

          console.log('*** New Mat Connection|', this.connections);
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

  private testTschVoltages(
    mat: powerMatNode,
    tsch: tsch,
  ): { voutProtocol: string; vinProtocol: string } | null {
    const vin = tsch.getVin();
    if (vin == null) {
      return null;
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
  }

  private generateNetConnections(): connectionOutputFormat[] {
    const outputFormat: Array<connectionOutputFormat> = [];
    const mapHelper: Map<string, Array<connect>> = new Map();
    if (this.connections.size > 0) {
      console.log('---');
      for (const [key, val] of this.connections.entries()) {
        mapHelper.clear();
        const pKey: typedProtocol = JSON.parse(key);
        const type = tschEDA.getFriendlyName(pKey.protocol);
        const typedConnections: typedProtocol[] = [pKey].concat(
          val.map((e) => e),
        );
        console.log(typedConnections);
        let subWires: string[] = [];
        if (!this.isMat(pKey.uuid)) {
          // is tsch
          const tsch = this.get(pKey.uuid);
          subWires = tschEDA.getSubWires(type, tsch!.getNets(pKey.protocol));
        }
        for (const typedConn of typedConnections) {
          let tsch: tsch | null = null;
          if (this.isMat(typedConn.uuid)) {
            tsch = this.getMat(typedConn.uuid)!.powerTsch;
            console.log('mat');
          } else {
            tsch = this.get(typedConn.uuid);
            console.log('tsch');
          }
          if (tsch) {
            if (subWires.length > 0) {
              // SPI protocol sub wires are for example [MISO, MOSI, SCK]
              // Connect by wire
              for (const subWire of subWires) {
                const net = tsch
                  .getNets(typedConn.protocol)
                  .filter((e) => e.includes(subWire))[0];
                // Set connect
                const connect: connect = {
                  schematic: tsch.getFileName(),
                  instance: tsch.getInstance()!,
                  net: net,
                };
                // Add to map helper
                const multiKey = JSON.stringify({
                  type: type,
                  wire: subWire,
                });
                if (mapHelper.has(multiKey)) {
                  let val: Array<connect> | undefined = mapHelper.get(multiKey);
                  if (val) {
                    val.push(connect);
                  }
                } else {
                  mapHelper.set(multiKey, [connect]);
                }
              }
            } else {
              const net = tsch.getNets(typedConn.protocol)[0];
              // Set connect
              const connect: connect = {
                schematic: tsch.getFileName(),
                instance: tsch.getInstance()!,
                net: net,
              };
              // Add to map helper
              const multiKey = JSON.stringify({
                type: type,
                wire: null,
              });
              if (mapHelper.has(multiKey)) {
                let val: Array<connect> | undefined = mapHelper.get(multiKey);
                if (val) {
                  val.push(connect);
                }
              } else {
                mapHelper.set(multiKey, [connect]);
              }
            }
          }
        }
        // Final format from map helper
        for (const [key, val] of mapHelper.entries()) {
          const index: { type: string; wire: string } = JSON.parse(key);
          const format: connectionOutputFormat = {
            type: index.type,
            wire: index.wire,
            connect: val,
          };
          outputFormat.push(format);
        }
      }
    }
    return outputFormat;
  }

  private generatePowerConnections() {
    // Traverse matNodes Tree by level
    let queue = new Queue();
    let nextLevel = new Queue();
    let level = 0;
    queue.enqueue(this.matsTree);
    while (!queue.isEmpty()) {
      let matNode: powerMatNode | undefined = queue.dequeue();
      console.log('BFS level', level, 'value: ', matNode);
      if (matNode) {
        for (const childs of matNode.children.values()) {
          nextLevel.enqueue(childs);
        }
      }
      if (queue.isEmpty()) {
        queue = nextLevel;
        nextLevel = new Queue();
        level++;
      }
    }
  }

  // Generate connections list in JSON format
  public generateJson(): string {
    // this.generatePowerConnections();
    return JSON.stringify(this.generateNetConnections(), null, 2);
  }

  public static getFriendlyName(protocol: string): string {
    const friendlyName = protocol.split('-')[0];
    return friendlyName ? friendlyName : '';
  }

  public static getSubWires(
    protocolFriedlyName: string,
    nets: Array<string>,
  ): Array<string> {
    const wires: Array<string> = [];
    const typednets = nets;
    for (const tyepnet of typednets) {
      for (const net of tyepnet.split('||')) {
        if (net.includes(protocolFriedlyName) && net.includes('.')) {
          const wire = net.split('.')[1];
          wires.push(wire);
        }
      }
    }
    return wires;
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
    const key = JSON.stringify(parent);
    if (this.connections.has(key)) {
      const val = this.connections.get(key);
      if (val) {
        this.connections.set(key, val.concat(childs));
      }
    } else {
      this.connections.set(key, childs);
    }
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

export { tschEDA, powerMatNode };

// class tschEDA {
//   constructor() {}
// }
