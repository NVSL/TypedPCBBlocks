"""
Schematic To Typed.

Outputs a JSON file with the schematic types, none if there are no types.

Usage:
  schematicToTyped.py -i SCHEMATIC_FILE

Options:
  -i         Input Schematic
"""
from __future__ import print_function
import sys
import json
import re
from ast import literal_eval
from types import resolve_bases
from Swoop import Swoop
from docopt import docopt

class dotdict(dict):
    """dot.notation access to dictionary attributes"""
    __getattr__ = dict.get
    __setattr__ = dict.__setitem__
    __delattr__ = dict.__delitem__

def main(arguments):

  # Read Arguments
  if arguments['-i'] and arguments['SCHEMATIC_FILE'] is True:
    print(arguments['SCHEMATIC_FILE'])

  def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

  def getProtocolNumber(protocolAndNumber):
    for charNum in reversed(range(len(protocolAndNumber))):
      if (not protocolAndNumber[charNum].isdigit()):
        return protocolAndNumber[charNum+1:]

  def saveTypedInfo(typedSchematic, typedInfo, typedProtocolAndNumber):
    ####
    # Save parsed data
    ####

    # Create dictionary if doesn't exists for protocol
    if(typedProtocolAndNumber not in typedSchematic[0]):
      typedSchematic[0][typedProtocolAndNumber] = []
    else:
      # Check if typed info is duplicate
      if (len(typedSchematic[0][typedProtocolAndNumber]) != 0):
        altname = typedSchematic[0][typedProtocolAndNumber][0].ALTNAME
        signal = typedSchematic[0][typedProtocolAndNumber][0].SIGNAL
        if (altname == typedInfo.ALTNAME and signal == typedInfo.SIGNAL):
          eprint("Error: duplicate protocol", typedProtocolAndNumber+".", "Add an ALTNAME to fix the error")
          quit()

    # Append typed information
    typedSchematic[0][typedProtocolAndNumber].append(typedInfo)

  ####
  # MAIN
  #### 
  boardFile = Swoop.EagleFile.from_file(arguments['SCHEMATIC_FILE']);
  # print(boardFile.__dict__.keys())

  # Initialize typed dictionary
  typedSchematic = [{}]

  for sheet in boardFile.sheets:
    for net in sheet.nets:

      ####
      # Minimal typed information parser
      ####
      if('#' in net):

        for protocolData in net.split('||'):

          # Dictionary variables
          typedProtocolAndNumber = ''
          typedInfo = dotdict({'NET': '', 'TYPE': '', 'ALTNAME': '', 'SIGNAL': '','VOLTAGE': '', 'VOLTAGE_LIST': '', 'VOLTAGE_RANGE': ''})

          # Set full net name name 
          typedInfo.NET = str(net)

          # Get schematic protocol data

          typedProtocolAndNumber = protocolData.partition('_')[0].partition('.')[0].partition('#')[2]
          if ('-' in typedProtocolAndNumber):
            typedInfo.ALTNAME = typedProtocolAndNumber.split('-')[1]
          else:
            typedInfo.ALTNAME = getProtocolNumber(typedProtocolAndNumber)
            if not typedInfo.ALTNAME:
              typedInfo.ALTNAME = '0'
          typedInfo.TYPE = typedProtocolAndNumber.partition(typedInfo.ALTNAME)[0].replace('#','').replace('-','')
          typedInfo.SIGNAL = protocolData.partition('_')[0].partition('.')[2].partition('_')[0]

          # Get voltage data and check if voltage is one number, a range or a list

          resVoltage = protocolData.partition('_')[2]
          resVoltage = resVoltage.replace("V", ""); # Remove all occurences of V (e.g 3.3V->3.3)
          if('-' in resVoltage):
            typedInfo.VOLTAGE_RANGE = resVoltage.split('-')
          elif (',' in resVoltage):
            typedInfo.VOLTAGE_LIST = resVoltage.split(',')
          else:
            typedInfo.VOLTAGE = resVoltage

          # Save Typed Info
          saveTypedInfo(typedSchematic, typedInfo, typedInfo.TYPE+"-"+typedInfo.ALTNAME)


      ####
      # Extended typed information parser
      ####
      if('[' and ']' in net):

        # Dictionary variables
        typedProtocolAndNumber = ''
        typedInfo = dotdict({'NET': '', 'TYPE': '', 'ALTNAME': '', 'SIGNAL': '','VOLTAGE': '', 'VOLTAGE_LIST': '', 'VOLTAGE_RANGE': ''})

        # Set full net name name 
        typedInfo.NET = str(net)

        # String to python dictionary
        netDictionary = dict(literal_eval(net))

        # Get schematic protocol data

        if('TYPE' in netDictionary):
          typedInfo.TYPE = netDictionary['TYPE']
        else:
          eprint('Error: Missing protocol type in', net)
          quit()

        if ('ALTNAME' in netDictionary):
          typedInfo.ALTNAME = str(netDictionary['ALTNAME'])
        else:
          typedInfo.ALTNAME = '0'
          
        typedProtocolAndNumber = typedInfo.TYPE+typedInfo.ALTNAME

        if ('SIGNAL' in netDictionary):
          typedInfo.SIGNAL = netDictionary['SIGNAL']

        # Get voltage data and check if voltage is one number, a range or a list

        if ('VOLTAGE' in netDictionary):
          typedInfo.VOLTAGE = str(netDictionary['VOLTAGE'])

        if ('VOLTAGE_LIST' in netDictionary):
          try:
            voltagelist = literal_eval(netDictionary['VOLTAGE_LIST'])
            if isinstance(voltagelist, list):
              typedInfo.VOLTAGE_LIST = [str(v).replace('V', '') for v in voltagelist]
          except Exception as e:
             eprint("Error: Could not parse", typedInfo.NET, e)
        
        if ('VOLTAGE_RANGE' in netDictionary):
          try:
            voltagelist =literal_eval(netDictionary['VOLTAGE_RANGE'])
            if isinstance(voltagelist, list):
              typedInfo.VOLTAGE_RANGE = [str(v) for v in voltagelist]
          except Exception as e:
             eprint("Error: Could not parse", typedInfo.NET, e)

        # Save Typed Info
        saveTypedInfo(typedSchematic, typedInfo, typedInfo.TYPE+"-"+typedInfo.ALTNAME)

  # Write Typed Datas
  with open('typedFile.json', 'w') as typedFile:
    print(json.dumps(typedSchematic[0], indent=4, sort_keys=True))
    json.dump(typedSchematic[0], typedFile ,indent=4, sort_keys=True)

  exit(1)


if __name__ == '__main__':
    arguments = docopt(__doc__, version='TypedSchematic v1.0')
    main(arguments)