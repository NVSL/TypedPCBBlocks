import { Flow } from '../Flow/Flow';
import { Tscheda, TschedaDebug } from 'tscheda';
import Utils from './Utils';

/*
TODOs:
- Set tsch-uuid and mat-uuid for each block and add them to html attributes
- Add event listeners to integrate connections.
PERSONAL TODOs:
- Fill taxes**, sell stuff, check jobs
*/

enum BlockType {
  computemodule = 'computemodule',
  pheripherial = 'pheripherial',
  matroot = 'matroot',
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
    // init listeners
    this.listeners();
  }

  public listeners() {
    this.flow.on('flowDrop', (data: any) => {
      console.log('Drop event', data);
    });
    this.flow.on('flowUndrop', (data: any) => {
      console.log('Un Drop event', data);
    });
    this.flow.on('flowConnect', (data: any) => {
      console.log('Connect event', data);
    });
  }

  public async addTypedSchematic(eagelFileName: string, x: number, y: number) {
    try {
      // TODO: Define tsch-uuid here
      let tschUuid = null;
      let matUuid = null;

      tschUuid = await this.tscheda.use(await Utils.eagelFile(eagelFileName));

      const typedSchematic = this.tscheda.typedSch(tschUuid);
      if (!typedSchematic) return;

      // Get extra information to get block's type
      // TODO: Move this to tsch under a new variable
      const extraInfo = this.tscheda.extraInfo(tschUuid);
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
      if (this.tscheda.tschOutputsPower(tschUuid)) {
        matUuid = this.tscheda.newMat(tschUuid);

        if (this.tscheda.isMatRoot(matUuid)) {
          blockType = BlockType.matroot;
        } else {
          blockType = BlockType.mat;
        }
      }

      console.log('BlockType', blockType);

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
            tschUuid,
            matUuid,
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
            tschUuid,
            matUuid,
            leftMap,
            rightMap,
            x,
            y,
            'pheripherial',
            pheripherial,
          );
          break;
        case BlockType.matroot:
        case BlockType.mat:
          const matModule = `
              <div>
                <div class="title-box">
                  <div>MAT</div>
                  <div>${eagelFileName}</div>
                </div>
              </div>
              `;
          this.flow.addNode(
            'MatTsch',
            tschUuid,
            matUuid,
            leftMap,
            rightMap,
            x,
            y,
            '',
            matModule,
          );
          break;
      }
    } catch (e) {
      throw e;
    }
  }
}

export { TschedaFlow };
