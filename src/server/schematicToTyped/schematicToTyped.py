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

  # MAIN 
  boardFile = Swoop.EagleFile.from_file(arguments['SCHEMATIC_FILE']);
  # print(boardFile.__dict__.keys())

  # Typed dictionary
  typedSchematic = [{}]


  for sheet in boardFile.sheets:
    for net in sheet.nets:

      protocolAndNumber = ''
      protocol = ''
      protocolNumber = ''
      protocolSignal = ''
      protocolVoltage = ''
      protocolVoltageType = ''
      foundTypedNet = False
      # Minimal typed information
      if('#' in net):
        foundTypedNet = True

        # Get schematic typed data
        protocolAndNumber = net.partition('_')[0].partition('.')[0].partition('#')[2]
        protocolNumber = getProtocolNumber(protocolAndNumber)
        if not protocolNumber:
          protocolNumber = "0"
        protocol = protocolAndNumber.partition(protocolNumber)[0]
        protocolSignal = net.partition('_')[0].partition('.')[2].partition('_')[0]

        # Check if voltage is one number, a range or a list
        resVoltage = net.partition('_')[2]
        resVoltage = resVoltage.replace("V", ""); # Remove all occurences of V (e.g 3.3V->3.3)
        protocolVoltage = []
        protocolVoltageType = "" # number, range or list
        if('-' in resVoltage):
          protocolVoltageType = "range"
          protocolVoltage = resVoltage.split('-')
        elif (',' in resVoltage):
          protocolVoltageType = "list"
          protocolVoltage = resVoltage.split(',')
        else:
          protocolVoltageType = "number"
          protocolVoltage = resVoltage

        # print(protocol)
        # print(protocolNumber)
        # print(protocolAndNumber)
        # print(protocolSignal)
        # print(protocolVoltage)

      # Extended typed information
      if('[' and ']' in net):
        foundTypedNet = True
        
        netDictionary = dict(literal_eval(net))

        if('TYPE' in netDictionary):
          protocol = netDictionary['TYPE']
        else:
          eprint('Missing protocol type in', net)
          quit()

        if ('NUMBER' in netDictionary):
          protocolAndNumber = netDictionary['TYPE']+str(netDictionary['NUMBER'])
          protocolNumber = str(netDictionary['NUMBER'])
        else:
          protocolAndNumber = netDictionary['TYPE']+'0'
          protocolNumber = '0'

        if ('SIGNAL' in netDictionary):
          protocolSignal = netDictionary['SIGNAL']
        else:
          protocolSignal = ''

        if ('VOLTAGE' in netDictionary):
          protocolVoltage = str(netDictionary['VOLTAGE'])
        else:
          protocolVoltage = ''

        protocolVoltageType = '' # TODO

      if (foundTypedNet):
        # Create dictionary if doesn't exists for protocol
        if(protocolAndNumber not in typedSchematic[0]):
          typedSchematic[0][protocolAndNumber] = []

        # Add Typed information
        typedSchematic[0][protocolAndNumber].append({'protocol': { 'type': protocol, 'number': protocolNumber, 'signal': protocolSignal }, 
        'voltage': {'type': protocolVoltageType, 'voltage': protocolVoltage}})
        

  # Write Typed Datas
  with open('typedFile.json', 'w') as typedFile:
    print(json.dumps(typedSchematic[0], indent=4, sort_keys=True))
    json.dump(typedSchematic[0], typedFile ,indent=4, sort_keys=True)

  exit(1)


if __name__ == '__main__':
    arguments = docopt(__doc__, version='TypedSchematic v1.0')
    main(arguments)