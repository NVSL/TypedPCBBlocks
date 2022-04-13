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

interface typedProtocol {
  uuid: uuid;
  protocol: string;
}

interface eagle {
  data: string;
  filename: string;
}

enum BlockType {
  computemodule = 'computemodule',
  pheripherial = 'pheripherial',
  matroot = 'matroot',
  mat = 'mat',
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
  connections: MultiMap<typedProtocol, typedProtocol[]>;
  typedConstraintsPath: string;
  constructor(typedConstrainsPath: string) {
    this.typedConstraintsPath = typedConstrainsPath;
    this.tschs = new Map();
    this.matsMap = new Map();
    this.matsTree = null;
    this.connections = new MultiMap();
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

      this.addConnection(key, [data]);

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
        this.addConnection(key, [data]);
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
      for (const [key, val] of this.connections.entries()) {
        mapHelper.clear();
        const type = Tscheda.getFriendlyName(key.protocol);
        const typedConnections: typedProtocol[] = [key].concat(
          val.map((e) => e),
        );
        let subWires: string[] = [];
        if (!this.isMat(key.uuid)) {
          // is tsch
          const tsch = this.getTsch(key.uuid);
          subWires = Tscheda.getSubWires(type, tsch!.getNets(key.protocol));
        }
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
  public generateJson(): string {
    const output = this.generateNetConnections();
    if (output.length == 0) {
      throw new TschedaError(
        ErrorCode.GenerateError,
        `No output data generated`,
      );
    }
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

  private treeBFS() {
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
        this.addConnection(parent, childs);
      } else {
        throw new TschedaError(
          ErrorCode.ConnectError,
          `Constraint error: ${error}, for protocol ${protocolName} when connecting ${parent} with childs ${childs}`,
        );
      }
    } catch (e) {
      throw new TschedaError(ErrorCode.ConnectError, `${e}`);
    }
  }

  // Adds connections by protocol to hashMap
  // Rule: This function replaces the connections if parent is found, it doesn't concat
  private addConnection(parent: typedProtocol, childs: typedProtocol[]) {
    if (this.connections.has(parent)) {
      const val = this.connections.get(parent);
      if (val) {
        // this.connections.set(parent, val.concat(childs));
        this.connections.set(parent, childs);
      }
    } else {
      this.connections.set(parent, childs);
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

  //###
  //### Prints
  //###

  public printConnectionMap(): void {
    console.log('@ Connection MAP');
    for (const [key, val] of this.connections.entries()) {
      console.log(key, '|', val);
    }
  }
}

export { Tscheda, Tsch, powerMatNode, BlockType, TschedaError, TschedaDebug };
