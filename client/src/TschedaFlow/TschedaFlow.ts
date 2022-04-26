import { Flow, DropEventInfo, ConnectEventInfo } from '../Flow/Flow';
import { Tscheda, TschedaDebug, TschedaError, BlockType } from 'tscheda';
import Utils from './Utils';

/*
TODOs:
- Set tsch-uuid and mat-uuid for each block and add them to html attributes
- Add event listeners to integrate connections.
- Next: Add connection dispatch, add Buttons (printConnectionMap, drc, generateJson)
PERSONAL TODOs:
- Fill taxes**, sell stuff, check jobs
*/

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
    this.flow.on('flowDrop', (data: DropEventInfo) => {
      console.log('Drop event', data);

      if (
        data.dragTschKey == null ||
        data.dropTschKey == null ||
        data.dropMatKey == null
      ) {
        this.flow.toastError(`Drop Event Info is inconsistent: ${data}`);
        this.flow.cancelDrop(data);
        return;
      }

      const dragBlockType = this.tscheda.getBlockType(data.dragTschKey);

      if (dragBlockType == null) {
        this.flow.toastError(
          `Tsch Key could not be processed. Tsch key data: ${data.dragTschKey}`,
        );
        this.flow.cancelDrop(data);
        return;
      }

      if (dragBlockType == BlockType.matroot) {
        this.flow.toastError(`A mat root is already assigned`);
        this.flow.cancelDrop(data);
        return;
      }

      if (dragBlockType == BlockType.mat) {
        // Add 'root' to mat
        if (data.dragMatKey == null) {
          this.flow.toastError(
            `Inconsistency error, drag mat key is null ${data}`,
          );
          this.flow.cancelDrop(data);
          return;
        }

        // Add mat to mat
        try {
          this.tscheda.addMat(data.dropMatKey, data.dragMatKey);
        } catch (e) {
          const error = e as TschedaError;
          this.flow.toastError(`${error.message}`);
          this.flow.cancelDrop(data);
          return;
        }
      } else {
        // Add tsch to mat
        try {
          this.tscheda.addTsch(data.dropMatKey, data.dragTschKey);
        } catch (e) {
          const error = e as TschedaError;
          this.flow.toastError(`${error.message}`);
          this.flow.cancelDrop(data);
          return;
        }
      }

      // Save drop info
      this.flow.enableDrop(data);
    });
    this.flow.on('flowUndrop', (data: DropEventInfo) => {
      console.log('Un Drop event', data);
    });
    this.flow.on('flowConnect', async (data: ConnectEventInfo) => {
      console.log('Connect event', data);
      if (data.fromTschKey == null || data.toTschKey == null) {
        this.flow.toastError(
          `Inconsistency error, from tsch ket or to tsch key is null ${data}`,
        );
        return;
      }
      try {
        // Add tsch to mat
        await this.tscheda.connect(
          {
            uuid: data.fromTschKey,
            protocol: data.connectInfo.fromProtocol.key,
          },
          [{ uuid: data.toTschKey, protocol: data.connectInfo.toProtocol.key }],
        );
        this.flow.connect(data.connectInfo);
      } catch (e) {
        const error = e as TschedaError;
        this.flow.toastError(`${error.message}`);
        this.flow.disconnect(data.connectInfo);
      }
    });
  }

  public generateJSONSchematic(): JSON | null {
    try {
      const jsonData = this.tscheda.generateJson();
      console.log('JSON OUTPUT', jsonData);
      return jsonData;
    } catch (e: any) {
      this.flow.toastError(e.toString());
      return null;
    }
  }

  public displayError(errMsg: string) {
    this.flow.toastError(errMsg);
  }

  public printConnectionMap() {
    this.tscheda.printConnectionMap();
  }

  public checkDRC() {
    this.tscheda.drc();
  }

  public async addTypedSchematic(eagelFileName: string, x: number, y: number) {
    try {
      // TODO: Define tsch-uuid here
      let tschUuid = null;
      let matUuid = null;

      tschUuid = await this.tscheda.use(await Utils.eagelFile(eagelFileName));

      const typedSchematic = this.tscheda.typedSch(tschUuid);
      if (!typedSchematic) return;

      let blockType = this.tscheda.getBlockType(tschUuid);
      console.log('BlockType', blockType);

      if (this.tscheda.tschOutputsPower(tschUuid)) {
        matUuid = this.tscheda.newMat(tschUuid);
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
          if (matUuid == null) {
            this.flow.toastError(`Inconsistency error, matroot is null`);
            return;
          }

          const matRootModule = `
              <div>
                <div class="title-box">
                  <div>MAT ROOT</div>
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
            matRootModule,
          );

          // Initialize mat Tree
          // TODO: If defined again show error
          this.tscheda.addMat('root', matUuid);

          break;
        case BlockType.mat:
          if (matUuid == null) {
            this.flow.toastError(`Inconsistency error, mat is null`);
            return;
          }

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
