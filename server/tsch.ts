import xml2js from 'xml2js';

interface TypedProtocol {
  protocol: string;
  altname: string;
  typedNets: string[];
  vars: {
    // Protocol properties
    [props: string]: string | number;
  };
}

interface TypedSchematic {
  [protocolKey: string]: TypedProtocol;
}

export default class tsch {
  eagle: any;
  eagleVersion: string | undefined = undefined;
  constructor() {}

  public async loadXML(data: string) {
    const parser2 = new xml2js.Parser({ mergeAttrs: true });
    try {
      const xml = await parser2.parseStringPromise(data);
      this.eagle = xml.eagle.drawing[0];
      this.eagleVersion = xml.eagle.version[0];
    } catch (e) {
      console.error('It seems xml is not an eagle file', e);
    }
    console.log(this.getNetNames());
    this.parseNetNames(this.getNetNames());
  }

  private getNetNames(): string[] {
    let netNames: string[] = [];
    const sheets = this.eagle.schematic[0].sheets;
    for (const sheet of sheets) {
      const nets = sheet.sheet[0].nets[0].net;
      for (const net of nets) {
        netNames.push(net.name[0]);
      }
    }
    return netNames;
  }

  // TODO: Complete parser and generate tsh or tsch file
  private parseNetNames(netNames: string[]) {
    const proto: TypedProtocol = {
      protocol: 'GPIO',
      altname: '0',
      typedNets: ['#I2C0.SDA||#ADC4'],
      vars: {
        netsVoltage: 5,
      },
    };
    let typedSch: TypedSchematic = {};
    typedSch['GPIO-0'] = proto;
    console.log(typedSch);
  }
}
