import { Queue } from './utils';
import { tsch, voltage, TypedSchematic } from './tsch';
import { test } from './testVoltages';

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
  typedConstraintsPath: string;
  constructor(typedConstrainsPath) {
    this.typedConstraintsPath = typedConstrainsPath;
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

  public getTsch(tschUuid: string): tsch | null {
    if (this.tschs.has(tschUuid)) {
      const Tsch = this.tschs.get(tschUuid);
      if (Tsch) return Tsch;
      else return null;
    }
    return null;
  }

  public getTschSourceVoltage(tschUuid: string): voltage | null {
    const Tsch = this.getTsch(tschUuid);
    if (Tsch) {
      return Tsch.sourceVoltage;
    }
    return null;
  }

  public isInDesing(tschUuid: string): boolean {
    const Tsch = this.getTsch(tschUuid);
    if (Tsch) {
      return Tsch.inDesign;
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

  public typedSchVars(tschUuid: uuid, key: string): any | null {
    const Tsch = this.getTsch(tschUuid);
    if (Tsch) {
      return Tsch.getVars(key);
    }
    return null;
  }

  // Asociates a tsch to a power mat
  // TODO: Add error handling inside a class
  // TODO: Add case for LED which doesn't have VIN
  public addTsch(matUuid: string, tschUuid: uuid): boolean {
    const Tsch = this.getTsch(tschUuid);
    if (!Tsch) return false;
    const Mat = this.getMat(matUuid);
    if (!Mat) return false;

    const vResult: {
      voutProtocol: string;
      vinProtocol: string;
    } | null = test.tschVoltages(Mat, Tsch);
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
    return '';
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
      const tsch = this.getTsch(tschOrTschUuid);
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

  public addMat(parentUuid: string | 'root', childMatUuid: string): boolean {
    if (parentUuid == '' || childMatUuid == '') {
      console.error('Empty string uuid');
      return false;
    }
    const childMat = this.getMat(childMatUuid);
    if (!childMat) {
      console.error('Mat uuid does not exists');
      return false;
    }
    if (childMat.powerTsch.inDesign == true) {
      console.error('child mat is already in design, create a new mat');
      return false;
    }
    if (parentUuid == 'root') {
      if (this.matsTree == null) {
        // Rule: Only mats with VOUT and no VIN can be added to root
        if (childMat.vin != null) {
          console.error('Mat root can not have VIN');
          return false;
        }
        // Store mat in Tree
        const mat = this.storeMatInTree('root', childMat);
        // Store mat in hashmap
        this.storeMatInHashMap(mat.uuid, mat);
        // Set in design
        mat.powerTsch.inDesign = true;
      } else {
        console.error(
          'Can not add another root, power mats tree alrady has a root',
        );
        return false;
      }
    } else {
      // Search for paernt
      //let parentMat: powerMatNode | undefined;
      const parentMat = this.getMat(parentUuid);
      if (parentMat) {
        // Test Voltages ranges between parent Mat and new Mat
        const vResult: {
          voutProtocol: string;
          vinProtocol: string;
        } | null = test.matVoltages(parentMat, childMat);
        if (vResult == null) {
          console.error(false, "Mat voltages doesn't fit");
          return false;
        } else {
          console.log(true, 'TEST VOLTAGES: Fit');
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
            uuid: parentUuid,
            protocol: vResult.voutProtocol,
          };
          const data: typedProtocol = {
            uuid: mat.uuid,
            protocol: vResult.vinProtocol,
          };
          // Store voltages connection
          this.addConnection(key, [data]);
        } else {
          console.error(
            'Child mat with uuid',
            childMat.uuid,
            'already exists in parent mat',
            parentMat.uuid,
          );
          return false;
        }
      } else {
        console.error('Parent Mat Uuid', parentUuid, 'not found');
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

  private storeMatInHashMap(childMatUuid: string, childMat: powerMatNode) {
    if (this.matsMap.has(childMatUuid)) {
      this.matsMap.set(childMatUuid, childMat);
    } else {
      this.matsMap.set(childMatUuid, childMat);
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

  private generateNetConnections(): connectionOutputFormat[] {
    const mapHelper: Map<string, Array<connect>> = new Map();
    function addToMapHelper(multiKey: string, connectInfo: connect) {
      if (mapHelper.has(multiKey)) {
        let val: Array<connect> | undefined = mapHelper.get(multiKey);
        if (val) {
          val.push(connectInfo);
        }
      } else {
        mapHelper.set(multiKey, [connectInfo]);
      }
    }
    const outputFormat: Array<connectionOutputFormat> = [];
    if (this.connections.size > 0) {
      for (const [key, val] of this.connections.entries()) {
        mapHelper.clear();
        const pKey: typedProtocol = JSON.parse(key);
        const type = tschEDA.getFriendlyName(pKey.protocol);
        const typedConnections: typedProtocol[] = [pKey].concat(
          val.map((e) => e),
        );
        let subWires: string[] = [];
        if (!this.isMat(pKey.uuid)) {
          // is tsch
          const tsch = this.getTsch(pKey.uuid);
          subWires = tschEDA.getSubWires(type, tsch!.getNets(pKey.protocol));
        }
        for (const typedConn of typedConnections) {
          let tsch: tsch | null = null;
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
                const multiKey = JSON.stringify({
                  type: type,
                  wire: subWire,
                });
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
              const multiKey = JSON.stringify({
                type: type,
                wire: null,
              });
              addToMapHelper(multiKey, connect);
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

  // Generate connections list in JSON format
  public generateJson(): string {
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

  ///// Constrain connectins

  private loadConstrains(protocol: any, typedJson: any) {
    const loadedProtocol = Object.assign(protocol, typedJson);
    return loadedProtocol;
  }

  public async connect(
    parent: typedProtocol,
    childs: typedProtocol[],
  ): Promise<boolean> {
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
      const protocolClass = await import(
        this.typedConstraintsPath + protocolName
      );
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
