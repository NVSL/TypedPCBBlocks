import fxparser from 'fast-xml-parser';
import RJSON from 'relaxed-json';
import { TschedaError, ErrorCode } from './error';

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
  position: 'Left' | 'Right';
  config: number;
  required: boolean;
  typedNets: string[];
  vars: {
    voltage: voltage;
  };
}

interface TypedProtocol {
  type: typedYType;
  name: string | null;
  altname: string;
  position: 'Left' | 'Right';
  config: number;
  required: boolean;
  typedNets: string[];
  vars: {
    // Protocol properties
    [props: string]: string | number | boolean;
  };
}

interface NetAndPosition {
  net: string;
  position: 'Left' | 'Right';
}

interface TypedSchematic {
  [protocolKey: string]: TypedProtocol | TypedPower;
}

interface Configuration {
  [typedNet: string]: Array<string>;
}

class Tsch {
  eagle: any;
  eagleVersion: string | null;
  eagleFileName: string;
  outputsPower: boolean;
  typedSchematic: TypedSchematic | null;
  configuration: Configuration;
  inDesign: boolean;
  sourceVoltage: voltage | null;
  instance: number | null;
  extraInfo: Map<string, string>;
  constructor() {
    this.eagleVersion = null;
    this.eagleFileName = '';
    this.outputsPower = false;
    this.typedSchematic = null;
    this.configuration = {};
    this.extraInfo = new Map();
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
    const parser = new fxparser.XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '_',
    });
    try {
      const xml: any = parser.parse(eagleData);
      this.eagle = xml.eagle.drawing;
      this.eagleVersion = xml.eagle._version;
      this.eagleFileName = eagleFileName;
    } catch (e) {
      throw new TschedaError(
        ErrorCode.ParseError,
        `File is not a XML eagle file, ${e}`,
      );
    }
    // console.log('>> NETS: ', this.getNetNames());
    // console.log('>> TEXTS: ', this.getTexts());
    // this.getNetNames();
    this.parse(this.getNetNames(), this.getTexts());
    this.checks();
    // console.log('>> TYPED SCHEMATIC: ', this.typedSchematic);
  }

  public getTsch(): TypedSchematic | null {
    if (this.typedSchematic) {
      return this.typedSchematic;
    } else {
      console.warn('Typed Schematic is null, load a typed schematic first');
      return null;
    }
  }

  public getConfig(): Configuration | null {
    if (this.configuration) {
      return this.configuration;
    } else {
      console.warn('Typed Schematic is null, load a typed schematic first');
      return null;
    }
  }

  public getVars(protocol: string): any {
    if (this.typedSchematic) {
      if (protocol in this.typedSchematic) {
        return this.typedSchematic[protocol].vars;
      } else {
        console.warn(
          `Protocol ${protocol} not found in Typed Schematic Dictionary`,
        );
        return null;
      }
    } else {
      console.warn('Typed Schematic is null, load a typed schematic first');
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
  private getNetNames(): NetAndPosition[] {
    let netsAndPositions: NetAndPosition[] = [];
    let netsObj: any[] = [];
    const sheets = this.eagle.schematic.sheets.sheet;
    if (Array.isArray(sheets)) {
      for (const sheetVal of sheets) {
        const sheet = sheetVal as any;
        const nets = sheet.nets.net;
        // Save nets obj
        if (nets) {
          netsObj.push(nets);
        }
      }
    } else {
      const nets = sheets.nets.net;
      // Save nets obj
      if (nets) netsObj.push(nets);
    }

    // Process nets object

    for (const nets of netsObj) {
      if (Array.isArray(nets)) {
        for (const netVal of nets) {
          const net = netVal as any;
          let rotation: string | undefined;
          if (net.segment && net.segment.label)
            rotation = net.segment.label._rot;
          const netAndPosition = this.setNameAndPosition(rotation, net._name);
          netsAndPositions.push(netAndPosition);
        }
      } else {
        const net = nets;
        let rotation: string | undefined;
        if (net.segment && net.segment.label) rotation = net.segment.label._rot;
        const netAndPosition = this.setNameAndPosition(rotation, net._name);
        netsAndPositions.push(netAndPosition);
      }
    }
    return netsAndPositions;
  }

  private setNameAndPosition(
    rotation: string | undefined,
    netName: string,
  ): NetAndPosition {
    let position: 'Left' | 'Right' = 'Right';
    switch (rotation) {
      case 'R90':
      case 'R180':
        position = 'Left';
        break;
      case 'R270':
      default:
        position = 'Right';
        break;
    }
    const netAndPosition = {
      net: netName,
      position: position,
    };
    return netAndPosition;
  }

  // Gets schematic text annotations
  private getTexts(): string[] {
    let schTexts: string[] = [];
    let textsObj: any[] = [];
    const sheets = this.eagle.schematic.sheets.sheet;
    if (Array.isArray(sheets)) {
      for (const sheetVal of sheets) {
        const sheet = sheetVal as any;
        const texts = sheet.plain.text;
        if (texts) textsObj.push(texts);
      }
    } else {
      const texts = sheets.plain.text;
      if (texts) textsObj.push(texts);
    }

    for (const texts of textsObj) {
      if (Array.isArray(texts)) {
        for (const textVal of texts) {
          const text = textVal as any;
          if (text['#text']) schTexts.push(text['#text']);
        }
      } else {
        if (texts['#text']) schTexts.push(texts['#text']);
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
            const currentVars: any = this.typedSchematic[nameAndAltame].vars;
            let newVars: any = typedProperty.vars;
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
                throw new TschedaError(
                  ErrorCode.ParseError,
                  `Typed power property key ${nameAndAltame} already exists.`,
                );
              } else {
                // Do nothing, is the same typedNet
              }
            } else {
              throw new TschedaError(
                ErrorCode.ParseError,
                `Format error, typedNet should exists for power:  ${typedProperty}`,
              );
            }
            break;
          default:
            throw new TschedaError(
              ErrorCode.ParseError,
              `Unknonw typedProtocol type:  ${typedProperty.type}`,
            );
        }
      } else {
        // Add Typed Property to Typed Schematic json
        this.typedSchematic[nameAndAltame] = typedProperty;
      }
    }
  }

  private appendConfiguration(
    typedProperty: TypedProtocol | TypedPower,
    typedNet: string,
    config: number,
  ) {
    // Typed Schematic key
    const nameAndAltame = typedProperty.name + '-' + typedProperty.altname;
    if (!(typedNet in this.configuration)) {
      this.configuration[typedNet] = new Array();
    }
    this.configuration[typedNet].push(nameAndAltame);
  }

  // Creates Typed Schematc dictionary from typed nets
  private parse(NetsAndPositions: NetAndPosition[], schTexts: string[]) {
    if (NetsAndPositions == undefined) {
      throw new TschedaError(ErrorCode.ParseError, `No net names`);
    }
    // ## Parse Net Names
    for (let typed of NetsAndPositions) {
      // Parse Typed Power Nets
      if (typed.net.includes('@')) {
        const required = typed.net.includes('!') ? false : true;
        const powerData = typed.net
          .replace('@', '')
          .replace('!', '')
          .split('_');
        if (powerData.length < 2) {
          throw new TschedaError(
            ErrorCode.ParseError,
            `Wrong format, VIN or VOUT is missing underscore and voltage (e.g. VOUT_3.3V) ${typed.net}`,
          );
        } else {
          const voltageName = powerData[0];
          const voltageData = powerData[1].replace(/V/g, '');

          // Init protocol
          const power: TypedPower = {
            type: 'power',
            name: null,
            altname: '0',
            position: typed.position,
            config: 0,
            required: required,
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
            throw new TschedaError(
              ErrorCode.ParseError,
              `Voltage Name is not either VIN or VOUT: ${voltageName}`,
            );
          }

          // Append typed net
          power.typedNets.push(typed.net);

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
                throw new TschedaError(
                  ErrorCode.ParseError,
                  `Wrong voltage range, voltage min > voltage max, in typed net: ${typed.net}`,
                );
              }
              power.vars.voltage.type = 'range';
              power.vars.voltage.value = voltage;
            } catch (e) {
              throw new TschedaError(
                ErrorCode.ParseError,
                'Unknonw parse error:' + e,
              );
            }
          } else if (voltageData.includes(',')) {
            const voltage: Array<number> = [];
            for (const v in voltageData.split(',')) {
              try {
                voltage.push(parseFloat(v));
              } catch (e) {
                throw new TschedaError(
                  ErrorCode.ParseError,
                  `In typed net ${typed.net}, could not parse ${v}`,
                );
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
              throw new TschedaError(
                ErrorCode.ParseError,
                `In typed net ${typed.net}, could not parse ${voltageData}`,
              );
            }
          }

          if (power.name != null) {
            // Append typed net to typed Schematic dictionary
            this.appendTypedProtocol(power);
            // Append configurations
            this.appendConfiguration(power, typed.net, 0);
          } else {
            throw new TschedaError(
              ErrorCode.ParseError,
              `Wrong format in typed net: ${typed.net}`,
            );
          }
        }
      }
      // Parse Typed Protcol Nets
      if (typed.net.includes('#')) {
        let configNum: number = 0;
        for (let protocolData of typed.net.split('||')) {
          // Check if typed net is required
          const required = protocolData.includes('!') ? false : true;
          // Remove #
          protocolData = protocolData.replace('#', '').replace('!', '');

          // Init protocol
          let protocolAndAltname = '';
          const protocol: TypedProtocol = {
            type: 'protocol',
            name: null,
            altname: '0',
            position: typed.position,
            config: configNum,
            required: required,
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
          protocol.typedNets.push(typed.net);

          // Checks
          if (protocol.name != '') {
            // Append typed net to typed Schematic dictionary
            this.appendTypedProtocol(protocol);
            // Append configurations
            this.appendConfiguration(protocol, typed.net, configNum);
          } else {
            throw new TschedaError(
              ErrorCode.ParseError,
              `Wrong format in typed net: ${typed.net}`,
            );
          }
          configNum++;
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
        let json: JSON = JSON.parse('{}');
        try {
          json = JSON.parse(RJSON.transform(cleanText));
        } catch (e) {
          throw new TschedaError(
            ErrorCode.ParseError,
            `Relaxed JSON error while parsing: ${this.eagleFileName} \n` +
              cleanText,
          );
        }

        for (const [key, newVars] of Object.entries(json)) {
          if (!key.includes('-')) {
            let found = false;
            // Apply to all protocols of the same protocol name
            for (const [tschKey] of Object.entries(this.typedSchematic)) {
              if (tschKey.split('-')[0] == key) {
                // Append new vars values:
                Object.assign(this.typedSchematic[tschKey].vars, newVars);
                // console.log('APPENDED:', this.typedSchematic[tschKey].vars);
                found = true;
              }
            }

            if (found == false) {
              // It's extra informatin
              this.extraInfo.set(key, newVars);
            }
          } else {
            if (key in this.typedSchematic) {
              // Append new vars values:
              Object.assign(this.typedSchematic[key].vars, newVars);
              // console.log('APPENDED:', this.typedSchematic[key].vars);
            } else {
              // It's extra information
              this.extraInfo.set(key, newVars);
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
        throw new TschedaError(
          ErrorCode.ParseError,
          `Only one VIN allowed per power typed Schematic, found ${vinCounter} more`,
        );
      }
    }
  }
}

export { TypedSchematic, Configuration, Tsch, voltage, range };
