import { error } from 'console';
import xml2js from 'xml2js';
import RJSON from 'relaxed-json';

interface TypedProtocol {
  protocol: string | null;
  altname: string;
  typedNets: string[];
  vars: {
    // Protocol properties
    [props: string]: string | number | boolean;
  };
}

interface TypedSchematic {
  [protocolKey: string]: TypedProtocol;
}

class tsch {
  eagle: any;
  eagleVersion: string | null;
  typedSchematic: TypedSchematic | null;
  constructor() {
    this.eagleVersion = null;
    this.typedSchematic = null;
  }

  // Parses eagle schematic XML and load nets
  public async loadTsch(eagleData: string): Promise<void> {
    const parser2 = new xml2js.Parser({ mergeAttrs: true });
    try {
      const xml = await parser2.parseStringPromise(eagleData);
      this.eagle = xml.eagle.drawing[0];
      this.eagleVersion = xml.eagle.version[0];
    } catch (e) {
      console.error('It seems xml is not an eagle file', e);
    }
    // console.log('>> NETS: ', this.getNetNames());
    // console.log('>> TEXTS: ', this.getTexts());
    this.parse(this.getNetNames(), this.getTexts());
    // console.log('>> TYPED SCHEMATIC: ', this.typedSchematic);
  }

  public getTsch(): TypedSchematic {
    if (this.typedSchematic) {
      return this.typedSchematic;
    } else {
      throw new Error('Typed Schematic is null, load a schematic first');
    }
  }

  public getVars(protocolKey: string): any {
    if (this.typedSchematic) {
      if (protocolKey in this.typedSchematic) {
        return this.typedSchematic[protocolKey].vars;
      } else {
        throw new Error(
          `Protocol ${protocolKey} not found in Typed Schematic Dictionary`,
        );
      }
    } else {
      throw new Error('Typed Schematic is null, load a schematic first');
    }
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
    for (const text of texts) {
      schTexts.push(text._);
    }
    return schTexts;
  }

  // Appends single Typed Protocol into Typed Schematic dictionary
  private appendTypedProtocol(typedProtocol: TypedProtocol) {
    // Form dictionary key
    const protocolAndAltame =
      typedProtocol.protocol + '-' + typedProtocol.altname;

    // Append Typed Protocol in Typed Schematic dictionary
    if (this.typedSchematic == null) {
      this.typedSchematic = {};
      this.typedSchematic[protocolAndAltame] = typedProtocol;
    } else {
      if (protocolAndAltame in this.typedSchematic) {
        // Merge typed nets
        const newTypedNets = this.typedSchematic[
          protocolAndAltame
        ].typedNets.concat(typedProtocol.typedNets);
        this.typedSchematic[protocolAndAltame].typedNets = newTypedNets;

        // Merge vars
        const currentVars = this.typedSchematic[protocolAndAltame].vars;
        let newVars = typedProtocol.vars;
        for (let key in currentVars) {
          if (key in newVars) {
            console.warn(
              'In merging typed nets',
              this.typedSchematic[protocolAndAltame].typedNets,
              'with',
              typedProtocol.typedNets,
              'Variable',
              key,
              'already exists',
            );
          } else {
            newVars[key] = currentVars[key];
          }
        }
        this.typedSchematic[protocolAndAltame].vars = newVars;
        // console.log('MERGING');
        // console.log(this.typedSchematic[protocolAndAltame].vars);
      } else {
        this.typedSchematic[protocolAndAltame] = typedProtocol;
      }
    }
  }

  // Creates Typed Schematc dictionary from typed nets
  private parse(netNames: string[], schTexts: string[]) {
    // ## Parse Net Names
    for (let typedNet of netNames) {
      if (typedNet.includes('#')) {
        for (let protocolData of typedNet.split('||')) {
          // Remove #
          protocolData = protocolData.replace('#', '');

          // Init protocol
          let protocolAndAltname = '';
          const protocol: TypedProtocol = {
            protocol: null,
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
          protocol.protocol = protocolAndAltname.split('-')[0];
          if (protocolAndAltname.split('-')[1]) {
            protocol.altname = protocolAndAltname.split('-')[1];
          }

          // Append typed net
          protocol.typedNets.push(typedNet);

          // Checks
          if (protocol.protocol == '') {
            console.error("Error, protocol is '' on typed net ", typedNet);
          } else {
            // Append typed net to typed Schematic dictionary
            this.appendTypedProtocol(protocol);
          }
        }
      }
    }

    // ## Parse Texts
    if (this.typedSchematic == null) {
      return;
    }
    for (const text of schTexts) {
      if (text.includes('#')) {
        const cleanText = text.replace('#', '');
        const json = JSON.parse(RJSON.transform(cleanText));
        console.log(json);
        for (const [key, newVars] of Object.entries(json)) {
          if (!key.includes('-')) {
            // Apply to all protocols of the same protocol name
            for (const [tschKey] of Object.entries(this.typedSchematic)) {
              if (tschKey.split('-')[0] == key) {
                // Append new vars values:
                Object.assign(this.typedSchematic[tschKey].vars, newVars);
                console.log('APPENDED:', this.typedSchematic[tschKey].vars);
              }
            }
          } else {
            if (key in this.typedSchematic) {
              // Append new vars values:
              Object.assign(this.typedSchematic[key].vars, newVars);
              console.log('APPENDED:', this.typedSchematic[key].vars);
            }
          }
        }
      }
    }
  }

  // ###### UTILS

  public static areEqual(protocolOne: string, protocolTwo: string): boolean {
    if (protocolOne.split('-')[0] === protocolTwo.split('-')[0]) {
      return true;
    } else {
      return false;
    }
  }

  // Get protocol name from protocol-altname
  // Input examples: GPIO-1, I2C-0, GPIO-RESET, ...
  // Return examples: GPIO, I2C, GPIO
  public static getProtocolName(
    protocolAndAltnameList: string[],
  ): string | null {
    if (protocolAndAltnameList.length == 0) {
      console.warn('Protocol and Altname List is zero');
      return null;
    } else {
      const protocolName = protocolAndAltnameList[0].split('-')[0];
      if (protocolAndAltnameList.length == 1) {
        return protocolAndAltnameList[0].split('-')[0];
      } else {
        for (const name of protocolAndAltnameList) {
          if (!this.areEqual(protocolName, name)) {
            console.warn(
              'Protocol and Altname List names are not equal:',
              protocolAndAltnameList,
            );
            return null;
          }
        }
        return protocolName;
      }
    }
  }
}

export { TypedSchematic, tsch };
