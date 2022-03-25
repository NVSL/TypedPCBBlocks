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

      // Add Node
      var computeModule = `
            <div>
              <div class="title-box"><i class="fas fa-code"></i> Compute Module</div>
            </div>
            `;
      this.flow.addNode(
        'BlockTsch',
        { 1: { name: 'GPIO', max: 2 } },
        {
          1: { name: 'GPIO', max: 2 },
          2: { name: 'I2C', max: 2 },
          3: { name: 'SPI', max: 2 },
          4: { name: 'UART', max: 2 },
        }, // 1:[type, max_connections]
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
