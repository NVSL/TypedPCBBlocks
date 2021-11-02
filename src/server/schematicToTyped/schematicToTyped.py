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

  ####
  # MAIN
  #### 
  boardFile = Swoop.EagleFile.from_file(arguments['SCHEMATIC_FILE']);
  # print(boardFile.__dict__.keys())

  # Initialize typed dictionary
  typedSchematic = [{}]

  for sheet in boardFile.sheets:
    for net in sheet.nets:

      # Dictionary variables
      typedProtocolAndNumber = ''
      typedInfo = dotdict({'NET': '', 'TYPE': '', 'NUMBER': '', 'SIGNAL': '','VOLTAGE': '', 'VOLTAGE_LIST': '', 'VOLTAGE_RANGE': ''})
      foundTypedNet = False

      ####
      # Minimal typed information parser
      ####
      if('#' in net):
        foundTypedNet = True

        # Save net name 
        typedInfo.NET = str(net)

        # Get schematic protocol data

        typedProtocolAndNumber = net.partition('_')[0].partition('.')[0].partition('#')[2]
        typedInfo.NUMBER = getProtocolNumber(typedProtocolAndNumber)
        if not typedInfo.NUMBER:
          typedInfo.NUMBER = "0"
        typedInfo.TYPE = typedProtocolAndNumber.partition(typedInfo.NUMBER)[0]
        typedInfo.SIGNAL = net.partition('_')[0].partition('.')[2].partition('_')[0]

        # Get voltage data and check if voltage is one number, a range or a list

        resVoltage = net.partition('_')[2]
        resVoltage = resVoltage.replace("V", ""); # Remove all occurences of V (e.g 3.3V->3.3)
        if('-' in resVoltage):
          typedInfo.VOLTAGE_RANGE = resVoltage.split('-')
        elif (',' in resVoltage):
          typedInfo.VOLTAGE_LIST = resVoltage.split(',')
        else:
          typedInfo.VOLTAGE = resVoltage


      ####
      # Extended typed information parser
      ####
      if('[' and ']' in net):
        foundTypedNet = True

        # Save net name 
        typedInfo.NET = str(net)
        
        # String to python dictionary
        netDictionary = dict(literal_eval(net))

        # Get schematic protocol data

        if('TYPE' in netDictionary):
          typedInfo.TYPE = netDictionary['TYPE']
        else:
          eprint('Missing protocol type in', net)
          quit()

        if ('NUMBER' in netDictionary):
          typedInfo.NUMBER = str(netDictionary['NUMBER'])
        else:
          typedInfo.NUMBER = '0'
          
        typedProtocolAndNumber = typedInfo.TYPE+typedInfo.NUMBER

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
          except:
            print("TODO: Rise exception")
        
        if ('VOLTAGE_RANGE' in netDictionary):
          try:
            voltagelist =literal_eval(netDictionary['VOLTAGE_RANGE'])
            if isinstance(voltagelist, list):
              typedInfo.VOLTAGE_RANGE = [str(v) for v in voltagelist]
          except:
            print("TODO: Rise exception")


      ####
      # Save parsed data
      ####
      if (foundTypedNet):

        # Create dictionary if doesn't exists for protocol
        if(typedProtocolAndNumber not in typedSchematic[0]):
          typedSchematic[0][typedProtocolAndNumber] = []

        # Add Typed information
        typedSchematic[0][typedProtocolAndNumber].append(typedInfo)
        

  # Write Typed Datas
  with open('typedFile.json', 'w') as typedFile:
    print(json.dumps(typedSchematic[0], indent=4, sort_keys=True))
    json.dump(typedSchematic[0], typedFile ,indent=4, sort_keys=True)

  exit(1)


if __name__ == '__main__':
    arguments = docopt(__doc__, version='TypedSchematic v1.0')
    main(arguments)