import { tsch, voltage } from './tsch';

class powerMatNode {
  uuid: string;
  parent: powerMatNode | 'root';
  children: Map<string, powerMatNode>;
  constructor(uuid, parent) {
    this.uuid = uuid;
    this.parent = parent;
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

  addMat(parentUuid: string, mat: powerMatNode): void {
    if (parentUuid == null || parentUuid == 'root') {
      if (this.matsTree == null) {
        // Store mat in Tree
        this.matsTree = new powerMatNode(mat.uuid, 'root');
        // Store mat in hashmap
        if (this.matsMap.has(this.matsTree.uuid)) {
          if (this.matsMap.get(this.matsTree.uuid) == undefined) {
            this.matsMap.set(this.matsTree.uuid, this.matsTree);
          } else {
            console.error('Power Mats Map alrady has', this.matsTree.uuid);
          }
        } else {
          this.matsMap.set(this.matsTree.uuid, this.matsTree);
        }
      } else {
        console.error('Power Mats Tree alrady has a root');
        return;
      }
    } else {
      // Search for paernt
      let parentMat: powerMatNode | undefined;
      if (this.matsMap.has(parentUuid)) {
        parentMat = this.matsMap.get(parentUuid);
      } else {
        console.error('Parent uuid', parentUuid, 'not found');
        return;
      }

      if (parentMat) {
        if (parentMat.children.has(mat.uuid)) {
          console.error(
            'New Mat with uuid',
            mat.uuid,
            'already exists in parent Mat',
            parentMat.uuid,
          );
        } else {
          // Store mat in Tree
          parentMat.children.set(
            mat.uuid,
            new powerMatNode(mat.uuid, this.matsTree),
          );
          // Store mat in hashmap
          const newMat = parentMat.children.get(mat.uuid);
          if (newMat) this.matsMap.set(mat.uuid, newMat);
          else console.error('New Mat Uuid', mat.uuid, 'undefined');
        }
      } else {
        console.error('Parent Mat Uuid', parentUuid, 'undefined');
      }
    }
  }

  newMat(): powerMatNode {
    // Get a unique randomUuid and save it to hashmap as undefied
    let randomUuid = this.getRandomUuid();
    while (this.matsMap.has(randomUuid)) {
      randomUuid = this.getRandomUuid();
    }
    this.matsMap.set(randomUuid, undefined);

    return new powerMatNode(randomUuid, null);
  }

  isMat(tsch: tsch): boolean {
    return tsch.outputsPower;
  }

  getRandomUuid(): string {
    // http://www.ietf.org/rfc/rfc4122.txt
    const s: Array<string> = [];
    let hexDigits = '0123456789abcdef';
    for (var i = 0; i < 36; i++) {
      s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = '4'; // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((parseInt(s[19]) & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = '-';

    var uuid = s.join('');
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
