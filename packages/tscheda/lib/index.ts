import { Queue, MultiMap } from './utils';
import { Tsch, voltage, TypedSchematic, Configuration } from './tsch';
import { test } from './testVoltages';
import TschedaDebug from './logger';
import { TschedaError, ErrorCode, result } from './error';

type uuid = string;

type connect = {
  schematic: string;
  instance: number;
  net: string;
};
interface connectionOutputFormat {
  type: string;
  wire: string | null;
  connect: Array<connect>;
}

interface connectionHelper {
  type: string;
  wire: string | null;
}

// FIXME: Change typedProtoco by Protocol interface
interface typedProtocol {
  uuid: uuid;
  protocol: string;
}

interface eagle {
  data: string;
  filename: string;
}

// TSCH Types

enum BlockType {
  computemodule = 'computemodule',
  pheripherial = 'pheripherial',
  matroot = 'matroot',
  mat = 'mat',
}

// Delete interfaces

interface DeleteEventInfo {
  toDeleteType: 'blockTsch' | 'matTsch' | 'connection';
  toDeleteTsch: {
    key: string;
    element: HTMLElement;
  } | null;
  toDeleteConnections: ConnectionData[];
}

interface ConnectionData {
  connectionID: string;
  connectionKey: string;
  from: {
    tschID: string;
    tschKey: string;
    ioID: string;
    ioKey: string;
    protocol: Protocol;
  };
  to: {
    tschID: string;
    tschKey: string;
    ioID: string;
    ioKey: string;
    protocol: Protocol;
  };
}

interface Protocol {
  key: string; // name + altname
  name: string; // GPIO, SPI, I2C
  altname: string; // 1,2,WP,RESET
}

// TODO: Move powerMat and powerMat node to another file
class powerMatNode {
  uuid: string;
  powerTsch: Tsch;
  vin: voltage | null;
  vout: voltage[];
  propagVout: voltage[];
  parent: powerMatNode | 'root' | null;
  tschMap: Map<string, Tsch>;
  children: Map<string, powerMatNode>;
  constructor(
    uuid: string,
    parent: powerMatNode | 'root' | null,
    powerTsch: Tsch,
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
class Tscheda {
  tschs: Map<string, Tsch>;
  matsMap: Map<string, powerMatNode | undefined>;
  matsTree: powerMatNode | null;
  connections: MultiMap<typedProtocol, typedProtocol[]>; // From-to connection map
  rawConections: Array<typedProtocol[]>; // True connection map
  typedConstraintsPath: string;
  constructor(typedConstrainsPath: string) {
    this.typedConstraintsPath = typedConstrainsPath;
    this.tschs = new Map();
    this.matsMap = new Map();
    this.matsTree = null;
    this.connections = new MultiMap();
    this.rawConections = new Array();
  }

  ///// TSCHS

  public async use(eagle: eagle): Promise<uuid> {
    const tsch = new Tsch();
    await tsch.loadTsch(eagle.data, eagle.filename);
    return this.newTsch(tsch);
  }

  public newTsch(tsch: Tsch): uuid {
    // Generate new ID
    let randomUuid = this.getRandomUuid();
    while (this.tschs.has(randomUuid)) {
      randomUuid = this.getRandomUuid();
    }
    this.tschs.set(randomUuid, tsch);
    tsch.uuid = randomUuid;
    // Update tsch instance number
    this.setInstance(tsch);
    return randomUuid;
  }

  public getTsch(tschUuid: string): Tsch | null {
    if (this.tschs.has(tschUuid)) {
      const tsch = this.tschs.get(tschUuid);
      if (tsch) return tsch;
      else return null;
    }
    return null;
  }

  public getTschSourceVoltage(tschUuid: string): voltage | null {
    const tsch = this.getTsch(tschUuid);
    if (tsch) {
      return tsch.sourceVoltage;
    }
    return null;
  }

  public isInDesing(tschUuid: string): boolean {
    const tsch = this.getTsch(tschUuid);
    if (tsch) {
      return tsch.inDesign;
    }
    return false;
  }

  public isTsch(tschOrTschUuid: any): boolean {
    if (typeof tschOrTschUuid === 'string') {
      if (this.getTsch(tschOrTschUuid)) {
        return true;
      }
    }

    if (tschOrTschUuid.eagle !== undefined) {
      return true;
    }

    return false;
  }

  public typedSch(tschUuid: uuid): TypedSchematic | null {
    const Tsch = this.getTsch(tschUuid);
    if (Tsch) {
      return Tsch.typedSchematic;
    }
    return null;
  }

  public extraInfo(tschUuid: uuid): Map<string, string> | null {
    const Tsch = this.getTsch(tschUuid);
    if (Tsch) {
      return Tsch.extraInfo;
    }
    return null;
  }

  public config(tschUuid: uuid): Configuration | null {
    const Tsch = this.getTsch(tschUuid);
    if (Tsch) {
      return Tsch.configuration;
    }
    return null;
  }

  public typedSchVars(tschUuid: uuid, key: string): any | null {
    const Tsch = this.getTsch(tschUuid);
    if (Tsch) {
      return Tsch.getVars(key);
    }
    return null;
  }

  public matsTreeEmpty(): boolean {
    if (this.matsTree == null) {
      return true;
    }
    return false;
  }

  public getBlockType(tschUuid: string): BlockType | null {
    if (this.isTsch(tschUuid) == false) return null;

    const extraInfo = this.extraInfo(tschUuid);
    let blockType: BlockType = BlockType.computemodule;
    if (extraInfo) {
      let block = extraInfo.get('BlockType');
      if (block) {
        block = block.toLocaleLowerCase();
        switch (block) {
          case BlockType.computemodule:
          default:
            blockType = BlockType.computemodule;
            break;
          case BlockType.pheripherial:
            blockType = BlockType.pheripherial;
            break;
          case BlockType.matroot:
            blockType = BlockType.matroot;
            break;
          case BlockType.mat:
            blockType = BlockType.mat;
            break;
        }
      }
    }
    if (this.tschOutputsPower(tschUuid)) {
      const Tsch = this.getTsch(tschUuid);
      if (Tsch == null) return null;

      if (Tsch.getVin() == null) {
        blockType = BlockType.matroot;
      } else {
        blockType = BlockType.mat;
      }
    }

    return blockType;
  }

  // Asociates a tsch to a power mat
  public addTsch(matUuid: string, tschUuid: uuid): void {
    const Tsch = this.getTsch(tschUuid);
    if (!Tsch) {
      throw new TschedaError(
        ErrorCode.AddTschError,
        `Typed Schematic Uuid ${tschUuid} not found`,
      );
    }
    const Mat = this.getMat(matUuid);
    if (!Mat) {
      throw new TschedaError(
        ErrorCode.AddTschError,
        `Power Mat Uuid ${matUuid} not found`,
      );
    }

    TschedaDebug.log(
      1,
      `>> [TEST] ADD TSCH ${Tsch.eagleFileName} IN MAT ${Mat.powerTsch.eagleFileName}`,
    );

    // Rule: if Tsch's doesn't have a VIN (e.g. LED) add them anyway
    if (Tsch.getVin() == null) {
      // ADD TSCH TO MAT
      Mat.tschMap.set(this.getRandomUuid(), Tsch);
      Tsch.inDesign = true;

      // DEBUG
      TschedaDebug.log(1, `>> [ADDING] TSCH TO MAT | NO VOLTAGE CONNECTION`);

      return;
    }

    // Rule: if Tsch's have VIN, test VIN voltage fits fit Mat
    const vResult: {
      voutProtocol: string;
      vinProtocol: string;
    } | null = test.tschVoltages(Mat, Tsch);
    if (vResult != null) {
      // ADD TSCH TO MAT
      Mat.tschMap.set(this.getRandomUuid(), Tsch);
      Tsch.inDesign = true;

      // SET AND ADD VOLTAGE CONNECTION
      // Set Tsch sourceVoltage
      Tsch.sourceVoltage = Mat.powerTsch.getVout(vResult.voutProtocol);
      // Set connection key and value
      const key: typedProtocol = {
        uuid: matUuid,
        protocol: vResult.voutProtocol,
      };
      const data: typedProtocol = {
        uuid: tschUuid,
        protocol: vResult.vinProtocol,
      };

      this.addConnection(key, data);

      // DEBUG
      TschedaDebug.log(
        1,
        `>> [ADDING] TSCH TO MAT | WITH VOLTAGE CONNECTION`,
        vResult,
      );

      return;
    } else {
      throw new TschedaError(
        ErrorCode.AddTschError,
        `Typed Schematic and Powert Mat voltages do not fit`,
      );
    }
  }

  //###
  //### POWER MAT METHODS
  //###

  public newMat(tschUuid: uuid): string {
    if (this.tschOutputsPower(tschUuid)) {
      const powerTsch = this.getTsch(tschUuid);
      if (powerTsch) {
        // Get a unique randomUuid and store it to hashmap as undefied
        let randomUuid = this.getRandomUuid();
        while (this.matsMap.has(randomUuid)) {
          randomUuid = this.getRandomUuid();
        }
        const matUuid = randomUuid;
        const mat = new powerMatNode(randomUuid, null, powerTsch);
        this.storeMatInHashMap(matUuid, mat);
        // Return a powerMatNode
        return matUuid;
      }
    }
    throw new TschedaError(
      ErrorCode.NewMatError,
      `Typed Schematic ${tschUuid} doesn't outputs power, therefore is not a Mat`,
    );
  }

  public getMat(matUuid: uuid): powerMatNode | null {
    if (this.matsMap.has(matUuid)) {
      const mat = this.matsMap.get(matUuid);
      if (mat) return mat;
      else return null;
    }
    return null;
  }

  public getMatOfInDesignTsch(tschUuid: string): powerMatNode | null {
    if (this.isInDesing(tschUuid)) {
      loop: for (const Mat of this.matsMap.values()) {
        if (Mat == undefined) continue loop;
        for (const tschUuidInMat of Mat.tschMap.keys()) {
          if (tschUuidInMat == tschUuid) {
            return Mat;
          }
        }
      }
    }
    return null;
  }

  public getInDesignTschsOfMat(mat: powerMatNode): Map<string, Tsch> {
    return mat.tschMap;
  }

  public getMatByTsch(tschUuid: string): powerMatNode | null {
    loop: for (const Mat of this.matsMap.values()) {
      if (Mat == undefined) continue loop;
      if (tschUuid == Mat.powerTsch.uuid) {
        return Mat;
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

  public isMatRoot(matOrMatUuid: any): boolean {
    // is uuid
    if (typeof matOrMatUuid === 'string') {
      const mat = this.getMat(matOrMatUuid);
      if (mat) {
        return true;
      }
    }

    // is mat
    if ((<powerMatNode>matOrMatUuid).powerTsch) {
      // is mat root
      if ((<powerMatNode>matOrMatUuid).vin == null) return true;
    }

    return false;
  }

  public tschOutputsPower(tschOrTschUuid: any) {
    // is uuid
    if (typeof tschOrTschUuid === 'string') {
      const tsch = this.getTsch(tschOrTschUuid);
      if (tsch) {
        if (tsch.outputsPower) {
          return true;
        }
      }
    }

    // is Tsch
    if (this.isTsch(tschOrTschUuid)) {
      if ((<Tsch>tschOrTschUuid).outputsPower) {
        return true;
      }
    }

    return false;
  }

  public addMat(parentMatUuid: string | 'root', childMatUuid: string): void {
    if (parentMatUuid == '' || childMatUuid == '') {
      throw new TschedaError(
        ErrorCode.AddMatError,
        `Parent Uuid ${parentMatUuid} or Child Uuid ${childMatUuid} are empty`,
      );
    }
    const childMat = this.getMat(childMatUuid);
    if (!childMat) {
      throw new TschedaError(
        ErrorCode.AddMatError,
        `Child Mat ${childMatUuid} does not found`,
      );
    }
    if (childMat.powerTsch.inDesign == true) {
      throw new TschedaError(
        ErrorCode.AddMatError,
        `Child Mat ${childMatUuid} already in design, create a new mat`,
      );
    }
    if (parentMatUuid == 'root') {
      if (this.matsTree == null) {
        // Rule: Only mats with VOUT and no VIN can be added to root
        if (childMat.vin != null) {
          throw new TschedaError(
            ErrorCode.AddMatError,
            `Root Mat ${childMatUuid} can't have a VIN typed net`,
          );
        }
        // Store mat in Tree
        const mat = this.storeMatInTree('root', childMat);
        // Store mat in hashmap
        this.storeMatInHashMap(mat.uuid, mat);
        // Set in design
        mat.powerTsch.inDesign = true;
      } else {
        throw new TschedaError(
          ErrorCode.AddMatError,
          `A Root Mat already exists`,
        );
      }
    } else {
      // Search for paernt
      const parentMat = this.getMat(parentMatUuid);
      if (!parentMat) {
        throw new TschedaError(
          ErrorCode.AddMatError,
          `Parent Mat Uuid ${parentMatUuid} not found`,
        );
      }

      TschedaDebug.log(
        1,
        `>> [TEST] ADD MAT ${childMat.powerTsch.eagleFileName} IN MAT ${parentMat.powerTsch.eagleFileName}`,
      );

      // Test Voltages ranges between parent Mat and new Mat
      const vResult: {
        voutProtocol: string;
        vinProtocol: string;
      } | null = test.matVoltages(parentMat, childMat);
      if (vResult == null) {
        throw new TschedaError(
          ErrorCode.AddMatError,
          `Parent Mat ${parentMatUuid} and ${childMatUuid} Mat voltages doesn't fit`,
        );
      }

      if (!parentMat.children.has(childMat.uuid)) {
        // Store mat in Tree
        const mat = this.storeMatInTree(parentMat, childMat);
        // Store mat in hashmap
        this.storeMatInHashMap(mat.uuid, mat);
        // Set in design
        mat.powerTsch.inDesign = true;
        // Add connection
        const key: typedProtocol = {
          uuid: parentMatUuid,
          protocol: vResult.voutProtocol,
        };
        const data: typedProtocol = {
          uuid: mat.uuid,
          protocol: vResult.vinProtocol,
        };
        TschedaDebug.log(1, `>> [ADDING] MAT VOLTAGE CONNECTION`, vResult);
        // Store voltages connection
        this.addConnection(key, data);
      } else {
        throw new TschedaError(
          ErrorCode.AddMatError,
          `Child Mat with uuid ${childMat.uuid}
            already exists in Parent Mat ${parentMat.uuid}`,
        );
      }
    }
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

  private storeMatInHashMap(childMatUuid: string, childMat: powerMatNode) {
    if (this.matsMap.has(childMatUuid)) {
      this.matsMap.set(childMatUuid, childMat);
    } else {
      this.matsMap.set(childMatUuid, childMat);
      return true;
    }
  }

  private setInstance(tsch: Tsch) {
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

  // private generateNetConnections(): connectionOutputFormat[] {
  //   const mapHelper: MultiMap<
  //     connectionHelper,
  //     Array<connect>
  //   > = new MultiMap();
  //   function addToMapHelper(key: connectionHelper, connectInfo: connect) {
  //     if (mapHelper.has(key)) {
  //       let val: Array<connect> | null = mapHelper.get(key);
  //       if (val) {
  //         val.push(connectInfo);
  //       }
  //     } else {
  //       mapHelper.set(key, [connectInfo]);
  //     }
  //   }

  //   if (this.connections.size == 0) {
  //     throw new TschedaError(
  //       ErrorCode.GenerateError,
  //       `No connections to process`,
  //     );
  //   }

  //   const outputFormat: Array<connectionOutputFormat> = [];
  //   if (this.connections.size > 0) {
  //     for (const [key, val] of this.connections.entries()) {
  //       mapHelper.clear();
  //       const type = Tscheda.getFriendlyName(key.protocol);
  //       const typedConnections: typedProtocol[] = [key].concat(
  //         val.map((e) => e),
  //       );
  //       let subWires: string[] = [];
  //       if (!this.isMat(key.uuid)) {
  //         // is tsch
  //         const tsch = this.getTsch(key.uuid);
  //         subWires = Tscheda.getSubWires(type, tsch!.getNets(key.protocol));
  //       }
  //       for (const typedConn of typedConnections) {
  //         let tsch: Tsch | null = null;
  //         if (this.isMat(typedConn.uuid)) {
  //           tsch = this.getMat(typedConn.uuid)!.powerTsch;
  //         } else {
  //           tsch = this.getTsch(typedConn.uuid);
  //         }
  //         if (tsch) {
  //           if (subWires.length > 0) {
  //             // SPI protocol sub wires are for example [MISO, MOSI, SCK]
  //             // Connect by wire
  //             for (const subWire of subWires) {
  //               const net = tsch
  //                 .getNets(typedConn.protocol)
  //                 .filter((e) => e.includes(subWire))[0];
  //               // Set connect
  //               const connect: connect = {
  //                 schematic: tsch.getFileName(),
  //                 instance: tsch.getInstance()!,
  //                 net: net,
  //               };
  //               // Add to map helper
  //               const multiKey: connectionHelper = {
  //                 type: type,
  //                 wire: subWire,
  //               };
  //               addToMapHelper(multiKey, connect);
  //             }
  //           } else {
  //             // Connect protocol with no subWires
  //             const net = tsch.getNets(typedConn.protocol)[0];
  //             // Set connect
  //             const connect: connect = {
  //               schematic: tsch.getFileName(),
  //               instance: tsch.getInstance()!,
  //               net: net,
  //             };
  //             // Add to map helper
  //             const multiKey: connectionHelper = {
  //               type: type,
  //               wire: null,
  //             };
  //             addToMapHelper(multiKey, connect);
  //           }
  //         } else {
  //           throw new TschedaError(
  //             ErrorCode.GenerateError,
  //             `Typed Schematic ${typedConn.uuid} not found`,
  //           );
  //         }
  //       }
  //       // Final format from map helper
  //       for (const [key, val] of mapHelper.entries()) {
  //         const index: connectionHelper = key;
  //         const format: connectionOutputFormat = {
  //           type: index.type,
  //           wire: index.wire,
  //           connect: val,
  //         };
  //         outputFormat.push(format);
  //       }
  //     }
  //   }
  //   return outputFormat;
  // }

  private generateNetConnections(): connectionOutputFormat[] {
    const mapHelper: MultiMap<
      connectionHelper,
      Array<connect>
    > = new MultiMap();
    function addToMapHelper(key: connectionHelper, connectInfo: connect) {
      if (mapHelper.has(key)) {
        let val: Array<connect> | null = mapHelper.get(key);
        if (val) {
          val.push(connectInfo);
        }
      } else {
        mapHelper.set(key, [connectInfo]);
      }
    }

    if (this.connections.size == 0) {
      throw new TschedaError(
        ErrorCode.GenerateError,
        `No connections to process`,
      );
    }

    const outputFormat: Array<connectionOutputFormat> = [];
    if (this.connections.size > 0) {
      const flattenedConnections = this.flattenRawConnection();
      for (const value of flattenedConnections.values()) {
        mapHelper.clear();
        // Get type from the first index value
        const type = Tscheda.getFriendlyName(value[0].protocol);
        const typedConnections: typedProtocol[] = value;
        let subWires: string[] = [];
        // Get if it's a mat's connetions or tsch connections
        if (!this.isMat(value[0].uuid)) {
          // is tsch
          const tsch = this.getTsch(value[0].uuid);
          subWires = Tscheda.getSubWires(
            type,
            tsch!.getNets(value[0].protocol),
          );
        }
        // Process connections
        for (const typedConn of typedConnections) {
          let tsch: Tsch | null = null;
          if (this.isMat(typedConn.uuid)) {
            tsch = this.getMat(typedConn.uuid)!.powerTsch;
          } else {
            tsch = this.getTsch(typedConn.uuid);
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
                const multiKey: connectionHelper = {
                  type: type,
                  wire: subWire,
                };
                addToMapHelper(multiKey, connect);
              }
            } else {
              // Connect protocol with no subWires
              const net = tsch.getNets(typedConn.protocol)[0];
              // Set connect
              const connect: connect = {
                schematic: tsch.getFileName(),
                instance: tsch.getInstance()!,
                net: net,
              };
              // Add to map helper
              const multiKey: connectionHelper = {
                type: type,
                wire: null,
              };
              addToMapHelper(multiKey, connect);
            }
          } else {
            throw new TschedaError(
              ErrorCode.GenerateError,
              `Typed Schematic ${typedConn.uuid} not found`,
            );
          }
        }
        // Final format from map helper
        for (const [key, val] of mapHelper.entries()) {
          const index: connectionHelper = key;
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

  public checkRequiredConnections(): void {
    // Get connections
    const connections: typedProtocol[] = [];
    for (const [key, values] of this.connections.entries()) {
      connections.push(key);
      connections.push(...values);
    }

    // Check that all required Typed Nets are connected
    for (const [uuid, tsch] of this.tschs.entries()) {
      if (tsch.inDesign) {
        if (tsch.typedSchematic && !tsch.outputsPower) {
          for (const [key, typedNet] of Object.entries(tsch.typedSchematic)) {
            if (typedNet.required && typedNet.type == 'protocol') {
              const typedStr = {
                uuid: uuid,
                protocol: key,
              };
              // If typedNets are required they must be connected
              const found = connections.find(
                (e) =>
                  typedStr.uuid == e.uuid && typedStr.protocol == e.protocol,
              )
                ? true
                : false;

              if (!found) {
                throw new TschedaError(
                  ErrorCode.DRCError,
                  `Typed Protocol ${key} in typed schematic ${tsch.eagleFileName} is required`,
                );
              }
            }
          }
        }
      }
    }
  }

  // Design Rule Checks
  public drc() {
    this.checkRequiredConnections();
  }

  // Generate connections list in JSON format
  public generateJson(): JSON {
    // Run drc
    this.drc();

    // Generate connections
    const output = this.generateNetConnections();
    if (output.length == 0) {
      throw new TschedaError(
        ErrorCode.GenerateError,
        `No output data generated`,
      );
    }
    return JSON.parse(JSON.stringify(this.generateNetConnections()));
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
          const wire = net.replace('!', '').split('.')[1];
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

  //###
  //### Protocol Constrains Connections
  //###

  private loadConstrains(protocol: any, typedJson: any) {
    const loadedProtocol = Object.assign(protocol, typedJson);
    return loadedProtocol;
  }

  public async connect(
    parent: typedProtocol,
    childs: typedProtocol[],
  ): Promise<void> {
    // Checks
    if (childs.length < 1) {
      throw new TschedaError(
        ErrorCode.ConnectError,
        'Typed Schematic child list must be greater than one',
      );
    }

    // Check if parent TSCH and child TSCHs are in design
    if (!this.isInDesing(parent.uuid)) {
      throw new TschedaError(
        ErrorCode.ConnectError,
        `Parent Typed Schematic ${parent.uuid} uuid is not in desing`,
      );
    }

    for (const child of childs) {
      if (!this.isInDesing(child.uuid)) {
        throw new TschedaError(
          ErrorCode.ConnectError,
          `Child Typed Schematic  ${child.uuid} uuid not in desing`,
        );
      }
    }

    // Check: Only protocols or the same type can be connected
    const protocolName = this.protocolListAreSame(parent, childs);
    if (protocolName == null) {
      throw new TschedaError(
        ErrorCode.ConnectError,
        `Protocol Names are not equal for parent ${parent} and childs ${childs}`,
      );
    }

    // Check: Multiple connections of same protcols between same instances are currently not permited
    // Example uuid=2 GPIO-1, and uuid=2 GPIO-3 to uuid=4 GPIO-5
    const inputs = [parent, ...childs];
    console.log('INPUTS', inputs);
    for (const input of inputs) {
      for (const value of this.rawConections.values()) {
        console.log('INPUT', input, 'VALUE', value);
        const res = value.filter(
          (v) => v.protocol == input.protocol && v.uuid == input.uuid,
        );
        console.log('FILTER RES', res);
        if (res.length != 0) {
          const otherInputUuids = inputs
            .filter((i) => {
              if (i.uuid && i.uuid != input.uuid) return i;
            })
            .map((r) => r.uuid);
          const otherValueUuids = value
            .filter((v) => {
              if (v.uuid && v.uuid != input.uuid) return v;
            })
            .map((r) => r.uuid);
          console.log('OTHER I', otherInputUuids, 'OTHER V', otherValueUuids);
          const test = otherInputUuids.filter((o) =>
            otherValueUuids.includes(o),
          );
          if (test.length != 0) {
            throw new TschedaError(
              ErrorCode.ConnectError,
              `Multiple connections to a same typed net between same instances are not permited`,
            );
          }
        }
      }
    }

    // DEBUG
    TschedaDebug.log(
      1,
      `>> [TEST] -${protocolName}- CONNECTING ${protocolName} of parent ${
        this.getTsch(parent.uuid)!.eagleFileName
      }`,
    );
    for (const child of childs) {
      TschedaDebug.log(1, `with ${this.getTsch(child.uuid)!.eagleFileName} `);
    }

    try {
      // Dynamically import protcol class
      const protocolClass = await import(
        /* @vite-ignore */
        // eslint-disable-next-line
        `${this.typedConstraintsPath}${protocolName}.js`
      );

      // Load tsch Parent Class
      const parentSourceVoltage = this.getTschSourceVoltage(parent.uuid);
      const tschClassParent: typeof protocolClass = this.loadConstrains(
        new protocolClass[protocolName](parentSourceVoltage),
        this.typedSchVars(parent.uuid, parent.protocol),
      );

      // DEBUG
      TschedaDebug.log(2, 'PARENT LOADED CLASS: \n', tschClassParent);

      // Load tsch Childs Class
      const tschClassChilds: typeof protocolClass = [];
      for (const child of childs) {
        const childSourceVoltage = this.getTschSourceVoltage(parent.uuid);
        const tschClass = this.loadConstrains(
          new protocolClass[protocolName](childSourceVoltage),
          this.typedSchVars(child.uuid, child.protocol),
        );
        tschClassChilds.push(tschClass);

        // DEBUG
        TschedaDebug.log(2, 'CHILD LOADED CLASS: \n', tschClass);
      }

      // Connect:
      const [result, error] = <result<boolean>>(
        tschClassParent.connect(tschClassChilds)
      );
      if (result) {
        // DEBUG
        TschedaDebug.log(
          1,
          `>> [ADDING] -${protocolName}- PROTOCOL CONNECTION of`,
          'parent',
          parent,
          'with childs',
          childs,
        );
        for (const child of childs) {
          this.addConnection(parent, child);
        }
      } else {
        throw new TschedaError(
          ErrorCode.ConnectError,
          `Constraint error - ${error}`,
        );
      }
    } catch (e) {
      throw new TschedaError(ErrorCode.ConnectError, `${e}`);
    }
  }

  // Adds connections by protocol to hashMap
  // Rule: This function replaces the connections if parent is found, it doesn't concat
  private addConnection(parent: typedProtocol, child: typedProtocol) {
    if (this.connections.has(parent)) {
      const currentChilds = this.connections.get(parent);
      if (currentChilds != null) {
        this.connections.set(parent, [...currentChilds, child]);
      }
    } else {
      // Else
      this.connections.set(parent, [child]);
    }

    // Add raw connections
    this.addRawConnection(parent, child);
  }

  private flattenRawConnection(): Array<typedProtocol[]> {
    const flattened: Array<typedProtocol[]> = new Array();
    for (const connections of this.rawConections) {
      let typedProtocolArray: typedProtocol[] = new Array();
      for (const connection of connections) {
        const find = typedProtocolArray.find(
          (value) =>
            value.protocol == connection.protocol &&
            value.uuid == connection.uuid,
        );
        if (find == undefined) {
          typedProtocolArray.push(connection);
        }
      }
      flattened.push(typedProtocolArray);
    }
    return flattened;
  }

  private addRawConnection(connOne: typedProtocol, connTwo: typedProtocol) {
    for (const [key, connections] of this.rawConections.entries()) {
      for (const connection of connections) {
        if (
          (connection.protocol == connOne.protocol &&
            connection.uuid == connOne.uuid) ||
          (connection.protocol == connTwo.protocol &&
            connection.uuid == connTwo.uuid)
        ) {
          // Save connection in same key
          const currentConns = this.rawConections.at(key);
          if (currentConns != null) {
            this.rawConections.splice(key, 1);
            this.rawConections.push([...currentConns, connOne, connTwo]);
            return;
          }
        }
      }
    }
    this.rawConections.push([connOne, connTwo]);
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

  //###
  //### Delete
  //###
  public remove(data: DeleteEventInfo) {
    switch (data.toDeleteType) {
      case 'matTsch':
        if (data.toDeleteTsch == null) throw 'Mat to delete not found';
        const tschUuid = data.toDeleteTsch.key;
        console.log('Key', tschUuid);
        // Get Mat uuid
        const mat = this.getMatByTsch(data.toDeleteTsch.key);
        if (mat == null) throw 'Mat to delete not found';
        // Check if Mat has Mapped chidrens
        const MappedTsch = this.getInDesignTschsOfMat(mat);
        if (MappedTsch.size != 0) {
          throw 'Delete Mat elements first';
        }
        // Check if Mat is a leaf with no children (Last in Tree)
        if (this.isMatChildrenEmpty(mat) == false)
          throw 'Delete Mat elements first';
        // Delete Mat VIN/VOUT from From-To connections
        for (const [key, val] of this.connections.entries()) {
          const array = [key, ...val];
          array.forEach((val) => {
            if (val.uuid == mat.uuid) {
              this.connections.delete(key);
            }
          });
        }
        // Delete Mat VIN/VOUT form RawConnections
        for (const [key, array] of this.rawConections.entries()) {
          array.forEach((val) => {
            if (val.uuid == mat.uuid) {
              this.rawConections.splice(key, 1);
            }
          });
        }
        // Delete Mat from Tree
        const parentMat = mat.parent;
        if (parentMat != 'root' && parentMat != null) {
          parentMat.children.delete(mat.uuid);
        } else if (parentMat == 'root') {
          this.matsTree = null;
        }
        this.matsMap.delete(mat.uuid);
        this.tschs.delete(tschUuid);
      default:
        break;
    }
  }

  private isMatChildrenEmpty(mat: powerMatNode): boolean {
    if (mat.children.size == 0) return true;
    return false;
  }

  //###
  //### Prints
  //###

  private printMatsTree() {
    // Traverse matNodes Tree by level
    let queue = new Queue();
    let nextLevel = new Queue();
    let level = 0;
    queue.enqueue(this.matsTree);
    while (!queue.isEmpty()) {
      let matNode: powerMatNode | undefined = queue.dequeue();
      console.log('Tree Level', level, 'Mat: ', matNode);
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

  public printConnectionMap(): void {
    console.log('#############################');
    console.log('@ From-To Connection MAP');
    for (const [key, val] of this.connections.entries()) {
      console.log(key, '|', val);
    }
    console.log('@ Raw Connection MAP');
    for (const [key, val] of this.rawConections.entries()) {
      console.log(key, '|', val);
    }
    console.log('@ Flattend Raw Connection MAP');
    for (const [key, val] of this.flattenRawConnection().entries()) {
      console.log(key, '|', val);
    }
    console.log('@ Mats Tree');
    this.printMatsTree();
    console.log('#############################');
  }
}

export { Tscheda, Tsch, powerMatNode, BlockType, TschedaError, TschedaDebug };
