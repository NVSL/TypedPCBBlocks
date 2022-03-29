import { Flow } from '../Flow/Flow';
import { Tscheda, TschedaDebug } from 'tscheda';
import Utils from './Utils';

enum BlockType {
  computemodule = 'computemodule',
  pheripherial = 'pheripherial',
  rootmat = 'rootmat',
  mat = 'mat',
}

class TschedaFlow {
  private tscheda: Tscheda;
  private flow: Flow;
  constructor(container: HTMLElement, typedConstrainsPath: string) {
    // init flow
    this.flow = new Flow(container);
    // init tscheda
    this.tscheda = new Tscheda(typedConstrainsPath);
    TschedaDebug.enable(true, 1);
  }
  public async addTypedSchematic(eagelFileName: string, x: number, y: number) {
    try {
      const atmega328 = await this.tscheda.use(
        await Utils.eagelFile(eagelFileName),
      );

      const typedSchematic = this.tscheda.typedSch(atmega328);
      if (!typedSchematic) return;

      // Get extra information to get block's type
      // TODO: Move this to tsch under a new variable
      const extraInfo = this.tscheda.extraInfo(atmega328);
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
            case BlockType.rootmat:
              blockType = BlockType.rootmat;
              break;
            case BlockType.mat:
              blockType = BlockType.mat;
              break;
          }
        }
      }
      if (this.tscheda.isMat(atmega328)) {
        // TODO: Diferientate between mat and rootmat
        blockType = BlockType.mat;
      }

      // Populate IOs
      let leftMapCnt = 0;
      const leftMap: { [key: number]: { name: string; altname: string } } = {};
      let rightMapCnt = 0;
      const rightMap: { [key: number]: { name: string; altname: string } } = {};
      loop: for (const typedSch of Object.values(typedSchematic)) {
        if (typedSch.config != 0 || typedSch.type != 'protocol') continue loop;
        switch (typedSch.position) {
          case 'Left':
            leftMap[leftMapCnt] = {
              name: typedSch.name!,
              altname: typedSch.altname!,
            };
            leftMapCnt++;
            break;
          case 'Right':
            rightMap[rightMapCnt] = {
              name: typedSch.name!,
              altname: typedSch.altname!,
            };
            rightMapCnt++;
            break;
        }
      }

      switch (blockType) {
        case BlockType.computemodule:
          const computeModule = `
              <div>
                <div class="title-box">
                  <div>Compute Module</div>
                  <div>${eagelFileName}</div>
                </div>
              </div>
              `;
          this.flow.addNode(
            'BlockTsch',
            leftMap,
            rightMap,
            x,
            y,
            'computeModule',
            computeModule,
          );
          break;
        case BlockType.pheripherial:
          const pheripherial = `
              <div>
                <div class="title-box">
                  <div>Pheripherial</div>
                  <div>${eagelFileName}</div>
                </div>
              </div>
              `;
          this.flow.addNode(
            'BlockTsch',
            leftMap,
            rightMap,
            x,
            y,
            'pheripherial',
            pheripherial,
          );
          break;
      }
    } catch (e) {
      throw e;
    }
  }
}

export { TschedaFlow };
