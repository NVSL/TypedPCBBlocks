"""
Schematic To Typed.

Outputs a JSON file with the schematic types, none if there are no types.

Usage:
  schematicToTyped.py

Options:
"""
import json
import copy
from Swoop import Swoop
from docopt import docopt


def main(arguments):

  # # Arguments 
  # device_spec = "";
  # if arguments['-i'] is True:
  #   device_spec = json.loads(arguments['JSON_FILE'])
  # else:
  #   with open(arguments['JSON_FILE'], 'r') as f:
  #     device_spec = json.loads(f.read())

  def copyBoard(refdesig_increase_num, user_input_x, user_input_y, boardFile, connectorFile):
    # ### Copy Dimension 

    # plain_element_temp_array = []
    # for plain_element in boardFile.plain_elements:
    #   if isinstance(plain_element, Swoop.Wire) == True:
    #     if plain_element.layer=='Dimension':
    #       plain_elementcpy = copy.deepcopy(plain_element)
    #       plain_elementcpy.x1 = plain_elementcpy.x1 + user_input_x
    #       plain_elementcpy.x2 = plain_elementcpy.x2 + user_input_x
    #       plain_elementcpy.y1 = plain_elementcpy.y1 + user_input_y
    #       plain_elementcpy.y2 = plain_elementcpy.y2 + user_input_y
    #       plain_element_temp_array.append(plain_elementcpy)

    # # Append & save brd file
    # for plain_element in plain_element_temp_array:
    #   plain_element.parent = boardFile
    #   boardFile.plain_elements.append(plain_element)

    ### Copy all Elements & Move them to connector pcb

    elements_temp_dic = {}
    for name,element in boardFile.elements.items():

      # Copy element and change its position
      elecpy = copy.deepcopy(element)
      elecpy.name = elecpy.name + refdesig_increase_num
      elecpy.x = elecpy.x + user_input_x
      elecpy.y = elecpy.y + user_input_y

      # For each attr of the copied element also change its position
      for attrcpy in elecpy.attributes:
        attrcpy.x = attrcpy.x + user_input_x
        attrcpy.y = attrcpy.y + user_input_y

      # Append copied elements to temporal dic
      elements_temp_dic[elecpy.name] = elecpy

    # Append & save brd file
    for name,elecpy in elements_temp_dic.items():
      elecpy.parent = connectorFile
      connectorFile.elements[name] = elecpy

    ### Copy all Signals & Move them to connector pcb

    # Copy each signal
    signals_temp_dic = {}
    for name,signal in boardFile.signals.items():
      signalcpy = copy.deepcopy(signal)
      signalcpy.name = signalcpy.name + refdesig_increase_num
      for contactref in signalcpy.contactrefs:
          contactref.element = contactref.element + refdesig_increase_num
          #contactref.element = contactref.element
      for wire in signalcpy.wires:
          wire.x1 = wire.x1 + user_input_x
          wire.y1 = wire.y1 + user_input_y
          wire.x2 = wire.x2 + user_input_x
          wire.y2 = wire.y2 + user_input_y
      for via in signalcpy.vias:
          via.x = via.x + user_input_x
          via.y = via.y + user_input_y
      for polygon in signalcpy.polygons:
        for vertex in polygon.vertices:
          vertex.x = vertex.x + user_input_x
          vertex.y = vertex.y + user_input_y

      # Add signal to temporal dic
      signals_temp_dic[signalcpy.name] = signalcpy

    # Append & save brd file
    for name,signalcpy in signals_temp_dic.items():
      signalcpy.parent = connectorFile
      connectorFile.signals[name] = signalcpy

  def copyLibs(boardFile, connectorFile):
    for name,library in boardFile.libraries.items():
      librarycpy = copy.deepcopy(library)
      librarycpy.parent = connectorFile
      connectorFile.libraries[name] = librarycpy

  def addAirwire(pcbFile, signalName, toElement, toPad):
    newContactref = (Swoop.Contactref()
      .set_element(toElement)
      .set_pad(toPad))
    newContactref.parent = pcbFile.signals[signalName]
    pcbFile.signals[signalName].contactrefs.append(newContactref)


  # MAIN 
  boardFile = Swoop.EagleFile.from_file('arduino_test_board.brd');
  connectorFile = Swoop.EagleFile.from_file('dimm_connector.brd');
  print(boardFile.__dict__.keys());

  copyLibs(boardFile, connectorFile)
  copyBoard('', 4, 26, boardFile, connectorFile)
  copyBoard('1', 30, 26, boardFile, connectorFile)
  copyBoard('2', 56, 26, boardFile, connectorFile)
  copyBoard('3', 82, 26, boardFile, connectorFile)

  # Connect all GNDs signals to Pad 1 of SODIMM (U$1)
  addAirwire(connectorFile, 'GND', 'U$1', '1')
  addAirwire(connectorFile, 'GND1', 'U$1', '2')
  addAirwire(connectorFile, 'GND2', 'U$1', '3')
  addAirwire(connectorFile, 'GND3', 'U$1', '4')

  # Connect all N$19 signals to Pad 2 of SODIMM (U$1)
  addAirwire(connectorFile, 'N$19', 'U$1', '5')
  addAirwire(connectorFile, 'N$191', 'U$1', '6')
  addAirwire(connectorFile, 'N$192', 'U$1', '7')
  addAirwire(connectorFile, 'N$193', 'U$1', '8')

  # Connect all RXI signals to Pad 3 of SODIMM (U$1)
  addAirwire(connectorFile, 'RXI', 'U$1', '9')
  addAirwire(connectorFile, 'RXI1', 'U$1', '10')
  addAirwire(connectorFile, 'RXI2', 'U$1', '11')
  addAirwire(connectorFile, 'RXI3', 'U$1', '12')

  # Connect all TXO signals to Pad 4 of SODIMM (U$1)
  addAirwire(connectorFile, 'TXO', 'U$1', '13')
  addAirwire(connectorFile, 'TXO1', 'U$1', '15')
  addAirwire(connectorFile, 'TXO2', 'U$1', '16')
  addAirwire(connectorFile, 'TXO3', 'U$1', '17')
  
  # Connect all TXO signals to Pad 4 of SODIMM (U$1)
  addAirwire(connectorFile, 'DTR', 'U$1', '18')
  addAirwire(connectorFile, 'DTR1', 'U$1', '19')
  addAirwire(connectorFile, 'DTR2', 'U$1', '20')
  addAirwire(connectorFile, 'DTR3', 'U$1', '21')


  # Create new brd file
  connectorFile.write('panelized.brd')

  exit(1)


if __name__ == '__main__':
    arguments = docopt(__doc__, version='Appliancizer Builder v1.0')
    main(arguments)