import xml2js from 'xml2js';
import RJSON from 'relaxed-json';

type range = { min: number; max: number };
type typedYType = 'power' | 'protocol';

interface voltage {
  protocol: string;
  io: 'out' | 'in' | null;
  isConnector: boolean; // TODO: Remove is Connector, then Only empty vin[] and a single or multiple vouts can be added to root.
  type: 'number' | 'range' | 'list' | null;
  value: number | range | Array<number> | null; // TODO: Remove lists? List of voltages ...what?
}

interface TypedPower {
  type: typedYType;
  name: string | null;
  altname: string;
  typedNets: string[];
  vars: {
    voltage: voltage;
  };
}

interface TypedProtocol {
  type: typedYType;
  name: string | null;
  altname: string;
  typedNets: string[];
  vars: {
    // Protocol properties
    [props: string]: string | number | boolean;
  };
}

interface TypedSchematic {
  [protocolKey: string]: TypedProtocol | TypedPower;
}

class tsch {
  eagle: any;
  eagleVersion: string | null;
  eagleFileName: string;
  outputsPower: boolean;
  typedSchematic: TypedSchematic | null;
  inDesign: boolean;
  sourceVoltage: voltage | null;
  instance: number | null;
  constructor() {
    this.eagleVersion = null;
    this.eagleFileName = '';
    this.outputsPower = false;
    this.typedSchematic = null;
    // Modified when added to design
    this.inDesign = false;
    this.sourceVoltage = null; // voltage[voutIndex] from Mat vout: voltage[]
    this.instance = null; // If same schematic, instance + 1
  }

  // Parses eagle schematic XML and load nets
  public async loadTsch(
    eagleData: string,
    eagleFileName: string,
  ): Promise<void> {
    const parser2 = new xml2js.Parser({ mergeAttrs: true });
    try {
      const xml = await parser2.parseStringPromise(eagleData);
      this.eagle = xml.eagle.drawing[0];
      this.eagleVersion = xml.eagle.version[0];
      this.eagleFileName = eagleFileName;
    } catch (e) {
      throw `>> Parsing error: 'It seems xml is not an eagle file', ${e}`;
    }
    // console.log('>> NETS: ', this.getNetNames());
    // console.log('>> TEXTS: ', this.getTexts());
    this.parse(this.getNetNames(), this.getTexts());
    this.checks();
    // console.log('>> TYPED SCHEMATIC: ', this.typedSchematic);
  }

  public getTsch(): TypedSchematic | null {
    if (this.typedSchematic) {
      return this.typedSchematic;
    } else {
      console.error('Typed Schematic is null, load a typed schematic first');
      return null;
    }
  }

  public getVars(protocol: string): any {
    if (this.typedSchematic) {
      if (protocol in this.typedSchematic) {
        return this.typedSchematic[protocol].vars;
      } else {
        console.error(
          `Protocol ${protocol} not found in Typed Schematic Dictionary`,
        );
        return null;
      }
    } else {
      console.error('Typed Schematic is null, load a typed schematic first');
      return null;
    }
  }

  public getVin(): voltage | null {
    if (this.typedSchematic) {
      for (const [key, val] of Object.entries(this.typedSchematic)) {
        if (val.type == 'power') {
          const typedPower = <TypedPower>val;
          if (typedPower.vars.voltage.io === 'in') {
            return typedPower.vars.voltage;
          }
        }
      }
    }
    return null;
  }

  public getFileName(): string {
    return this.eagleFileName;
  }

  public getInstance(): number | null {
    return this.instance;
  }

  public getNets(protocol: string): Array<string> {
    if (this.typedSchematic) {
      return this.typedSchematic[protocol].typedNets;
    }
    return [];
  }

  public getVouts(): voltage[] {
    const vout: voltage[] = [];
    if (this.typedSchematic) {
      for (const val of Object.values(this.typedSchematic)) {
        if (val.type == 'power') {
          const voltage = (<TypedPower>val).vars.voltage;
          if (voltage.io === 'out') {
            vout.push(voltage);
          }
        }
      }
    }
    return vout;
  }

  public getVout(protocol: string): voltage | null {
    const vout: voltage[] | null = [];
    if (this.typedSchematic) {
      for (const val of Object.values(this.typedSchematic)) {
        if (val.type == 'power') {
          const voltage = (<TypedPower>val).vars.voltage;
          if (voltage.io === 'out' && voltage.protocol == protocol) {
            return voltage;
          }
        }
      }
    }
    return null;
  }

  // Gets schematic net names
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

  // Gets schematic text annotations
  private getTexts(): string[] {
    let schTexts: string[] = [];
    const texts = this.eagle.schematic[0].sheets[0].sheet[0].plain[0].text;
    if (texts) {
      for (const text of texts) {
        schTexts.push(text._);
      }
    }
    return schTexts;
  }

  // Appends single Typed Protocol or Typed Power into Typed Schematic dictionary
  private appendTypedProtocol(typedProperty: TypedProtocol | TypedPower) {
    // Form dictionary key
    const nameAndAltame = typedProperty.name + '-' + typedProperty.altname;

    // Append Typed Protocol in Typed Schematic dictionary
    if (this.typedSchematic == null) {
      this.typedSchematic = {};
      this.typedSchematic[nameAndAltame] = typedProperty;
    } else {
      if (nameAndAltame in this.typedSchematic) {
        switch (typedProperty.type) {
          case 'protocol':
            // Merge typed nets
            const newTypedNets = this.typedSchematic[
              nameAndAltame
            ].typedNets.concat(typedProperty.typedNets);
            this.typedSchematic[nameAndAltame].typedNets = newTypedNets;

            // Merge vars
            const currentVars = this.typedSchematic[nameAndAltame].vars;
            let newVars = typedProperty.vars;
            for (let key in currentVars) {
              if (key in newVars) {
                console.warn(
                  'In merging typed nets',
                  this.typedSchematic[nameAndAltame].typedNets,
                  'with',
                  typedProperty.typedNets,
                  'Variable',
                  key,
                  'already exists',
                );
              } else {
                newVars[key] = currentVars[key];
              }
            }
            this.typedSchematic[nameAndAltame].vars = newVars;
            // console.log('MERGING');
            // console.log(this.typedSchematic[protocolAndAltame].vars);
            break;
          case 'power':
            // Only one typedNet for each power property, otherwhise error
            if (typedProperty.typedNets.length == 1) {
              if (
                typedProperty.typedNets[0] !=
                this.typedSchematic[nameAndAltame].typedNets[0]
              ) {
                throw `>> Parsing error: Typed power property key ${nameAndAltame} already exists.`;
              } else {
                // Do nothing, is the same typedNet
              }
            } else {
              throw `>> Parsing error: Format error, typedNet should exists for power:  ${typedProperty}`;
            }
            break;
          default:
            throw `>> Parsing error: Unknonw typedProtocol type:  ${typedProperty.type}`;
        }
      } else {
        // Add Typed Property to Typed Schematic json
        this.typedSchematic[nameAndAltame] = typedProperty;
      }
    }
  }

  // Creates Typed Schematc dictionary from typed nets
  private parse(netNames: string[], schTexts: string[]) {
    // ## Parse Net Names
    for (let typedNet of netNames) {
      // Parse Typed Power Nets
      if (typedNet.includes('@')) {
        const powerData = typedNet.replace('@', '').split('_');
        if (powerData.length < 2) {
          throw `>> Parsing error: Wrong format, VIN or VOUT is missing underscore and voltage (e.g. VOUT_3.3V) ${typedNet}`;
        } else {
          const voltageName = powerData[0];
          const voltageData = powerData[1].replace(/V/g, '');

          // Init protocol
          const power: TypedPower = {
            type: 'power',
            name: null,
            altname: '0',
            typedNets: [],
            vars: {
              voltage: {
                protocol: '',
                io: null,
                isConnector: false,
                type: null,
                value: null,
              },
            },
          };

          // Get protocol name and altname
          power.name = voltageName.split('-')[0];
          if (voltageName.split('-')[1]) {
            power.altname = voltageName.split('-')[1];
          }

          // Set protocol aka voltageName + altmane
          power.vars.voltage.protocol = power.name + '-' + power.altname;

          // Check if voltage type is IN or OUT
          if (voltageName.includes('VIN') || voltageName.includes('VOUT')) {
            power.name = voltageName;
            // Schematic outputs power
            if (voltageName.includes('VOUT')) {
              this.outputsPower = true;
              power.vars.voltage.io = 'out';
            } else {
              power.vars.voltage.io = 'in';
            }
          } else {
            throw `>> Parsing error: Voltage Name is not either VIN or VOUT: ${voltageName}`;
          }

          // Append typed net
          power.typedNets.push(typedNet);

          // Parse voltage data
          if (voltageData.includes('-')) {
            // It's voltage range
            voltageData.split('-');
            try {
              const voltage: range = {
                min: parseFloat(voltageData.split('-')[0]),
                max: parseFloat(voltageData.split('-')[1]),
              };
              if (voltage.min > voltage.max) {
                throw `Wrong voltage range, voltage min > voltage max, in typed net: ${typedNet}`;
              }
              power.vars.voltage.type = 'range';
              power.vars.voltage.value = voltage;
            } catch (e) {
              throw '>> Parsing error: ' + e;
            }
          } else if (voltageData.includes(',')) {
            const voltage: Array<number> = [];
            for (const v in voltageData.split(',')) {
              try {
                voltage.push(parseFloat(v));
              } catch (e) {
                throw `>> Parsing error: In typed net ${typedNet}, could not parse ${v}`;
              }
            }
            power.vars.voltage.type = 'list';
            power.vars.voltage.value = voltage;
          } else if (voltageData == 'CONNECTOR') {
            power.vars.voltage.isConnector = true;
          } else {
            if (!isNaN(Number(voltageData))) {
              power.vars.voltage.type = 'number';
              power.vars.voltage.value = parseFloat(voltageData);
            } else {
              throw `>> Parsing error: In typed net ${typedNet}, could not parse ${voltageData}`;
            }
          }

          if (power.name != null) {
            // Append typed net to typed Schematic dictionary
            this.appendTypedProtocol(power);
          } else {
            throw `>> Parsing error: Wrong format in typed net: ${typedNet}`;
          }
        }
      }
      // Parse Typed Protcol Nets
      if (typedNet.includes('#')) {
        for (let protocolData of typedNet.split('||')) {
          // Remove #
          protocolData = protocolData.replace('#', '');

          // Init protocol
          let protocolAndAltname = '';
          const protocol: TypedProtocol = {
            type: 'protocol',
            name: null,
            altname: '0',
            typedNets: [],
            vars: {},
          };

          // Get net signal name
          if (protocolData.includes('.')) {
            protocolAndAltname = protocolData.split('.')[0];
            const signal = protocolData.split('.')[1];
            protocol.vars[signal] = true;
          } else {
            protocolAndAltname = protocolData;
          }

          // Get protocol name and altname
          protocol.name = protocolAndAltname.split('-')[0];
          if (protocolAndAltname.split('-')[1]) {
            protocol.altname = protocolAndAltname.split('-')[1];
          }

          // Append typed net
          protocol.typedNets.push(typedNet);

          // Checks
          if (protocol.name != '') {
            // Append typed net to typed Schematic dictionary
            this.appendTypedProtocol(protocol);
          } else {
            throw `>> Parsing error: Wrong format in typed net: ${typedNet}`;
          }
        }
      }
    }

    // ## Parse Texts
    if (this.typedSchematic == null || schTexts.length == 0) {
      return;
    }
    for (const text of schTexts) {
      if (text.includes('#')) {
        const cleanText = text.replace('#', '');
        const json = JSON.parse(RJSON.transform(cleanText));
        // console.log(json);
        for (const [key, newVars] of Object.entries(json)) {
          if (!key.includes('-')) {
            // Apply to all protocols of the same protocol name
            for (const [tschKey] of Object.entries(this.typedSchematic)) {
              if (tschKey.split('-')[0] == key) {
                // Append new vars values:
                Object.assign(this.typedSchematic[tschKey].vars, newVars);
                // console.log('APPENDED:', this.typedSchematic[tschKey].vars);
              }
            }
          } else {
            if (key in this.typedSchematic) {
              // Append new vars values:
              Object.assign(this.typedSchematic[key].vars, newVars);
              // console.log('APPENDED:', this.typedSchematic[key].vars);
            }
          }
        }
      }
    }
  }

  private checks() {
    // Check that only one VIN is allowed per typed Schematic
    if (this.typedSchematic) {
      let vinCounter = 0;
      for (const typedSch of Object.values(this.typedSchematic)) {
        if (typedSch.type === 'power') {
          if ((<TypedPower>typedSch).vars.voltage.io == 'in') {
            vinCounter++;
          }
        }
      }
      if (vinCounter > 1) {
        throw `>> Parsing error: Only one VIN allowed per power typed Schematic, found ${vinCounter} more`;
      }
    }
  }
}

export { TypedSchematic, tsch, voltage, range };
