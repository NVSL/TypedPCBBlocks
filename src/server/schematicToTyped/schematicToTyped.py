"""
Schematic To Typed.

Outputs a JSON file with the schematic types, none if there are no types.

Usage:
  schematicToTyped.py -i SCHEMATIC_FILE

Options:
  -i         Input Schematic
"""
import json
import re
from Swoop import Swoop
from docopt import docopt


def main(arguments):

  # Read Arguments
  if arguments['-i'] and arguments['SCHEMATIC_FILE'] is True:
    print(arguments['SCHEMATIC_FILE'])


  def getProtocolNumber(protocolAndNumber):
    for charNum in reversed(range(len(protocolAndNumber))):
      if (not protocolAndNumber[charNum].isdigit()):
        return protocolAndNumber[charNum+1:]

  # MAIN 
  boardFile = Swoop.EagleFile.from_file(arguments['SCHEMATIC_FILE']);
  # print(boardFile.__dict__.keys())

  typedSchematic = [{}]
  for sheet in boardFile.sheets:
    # print(sheet.nets)
    for net in sheet.nets:
      # print(net)
      if('#' in net):
        # Get schematic typed data
        protocolAndNumber = net.partition('_')[0].partition('.')[0].partition('#')[2]
        protocolNumber = getProtocolNumber(protocolAndNumber)
        if not protocolNumber:
          protocolNumber = "0"
        protocol = protocolAndNumber.partition(protocolNumber)[0]
        protocolSubnet = net.partition('_')[0].partition('.')[2].partition('_')[0]
        protocolVoltage = net.partition('_')[2]

        # print(protocol)
        # print(protocolNumber)
        # print(protocolAndNumber)
        # print(protocolSubnet)
        # print(protocolVoltage)
        
        # Append schematic net data
        if(protocolAndNumber not in typedSchematic[0]):
          typedSchematic[0][protocolAndNumber] = []
        typedSchematic[0][protocolAndNumber].append({'protocol':protocol, 'number': protocolNumber, 'net': protocolSubnet, 'voltage': protocolVoltage})

  # Write Typed Data
  with open('typedFile.json', 'w') as typedFile:
    print(json.dumps(typedSchematic[0], indent=4, sort_keys=True))
    json.dump(typedSchematic[0], typedFile ,indent=4, sort_keys=True)

  exit(1)


if __name__ == '__main__':
    arguments = docopt(__doc__, version='TypedSchematic v1.0')
    main(arguments)