import { Flow } from '../Flow/Flow';
import { Tscheda, TschedaDebug } from 'tscheda';
import Utils from './Utils';

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
  public async addTypedSchematic(eagelFileName: string) {
    try {
      const atmega328 = await this.tscheda.use(
        await Utils.eagelFile(eagelFileName),
      );
      const typedSchematic = this.tscheda.typedSch(atmega328);

      if (!typedSchematic) return;

      let leftMapCnt = 0;
      const leftMap: { [key: number]: { name: string; max: number } } = {};
      let rightMapCnt = 0;
      const rightMap: { [key: number]: { name: string; max: number } } = {};
      // Add Node
      loop: for (const typedSch of Object.values(typedSchematic)) {
        if (typedSch.config != 0 || typedSch.type != 'protocol') continue loop;
        switch (typedSch.position) {
          case 'Left':
            leftMap[leftMapCnt] = { name: typedSch.name!, max: 1 };
            leftMapCnt++;
            break;
          case 'Right':
            rightMap[rightMapCnt] = { name: typedSch.name!, max: 1 };
            rightMapCnt++;
            break;
        }
      }

      const computeModule = `
            <div>
              <div class="title-box"><i class="fas fa-code"></i> Compute Module</div>
            </div>
            `;
      this.flow.addNode(
        'BlockTsch',
        leftMap,
        rightMap, // 1:[type, max_connections]
        100,
        100,
        'computeModule',
        computeModule,
      );
    } catch (e) {
      throw e;
    }
  }
}

export { TschedaFlow };
