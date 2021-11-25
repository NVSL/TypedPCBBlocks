class powerMatNode {
  tschName: string;
  tschCtr: number;
  matsCtr: number;
  parent: powerMatNode | string;
  children: Map<string, powerMatNode>;
  constructor(tschName, parent) {
    this.tschName = tschName;
    this.tschCtr = 0;
    this.matsCtr = 0;
    this.parent = parent;
    this.children = new Map();
  }
}

// Power cascade
class powerMat {
  powerMats: powerMatNode | null;
  constructor() {
    this.powerMats = null;
  }
  addMat(tschName: string) {
    if (this.powerMats == null) {
      this.powerMats = new powerMatNode(tschName, 'root');
    } else {
      const uniqueName = tschName + this.powerMats.matsCtr;
      this.powerMats.children[uniqueName] = new powerMatNode(
        tschName,
        this.powerMats,
      );
      this.powerMats.matsCtr++;
    }
  }
  // TODO: Add unique() -> ouputs unique key which will be used for the visual editor or add a hashmap 0 -> tschName
  // TODO: Check voltage structure, (add a new unique character? @ for voltage ?)
  // TODO: Add I2C and constrains
  // TODO: Definetely check or redo the visual blocks.
}

export { powerMat };

// class tschEDA {
//   constructor() {}
// }
