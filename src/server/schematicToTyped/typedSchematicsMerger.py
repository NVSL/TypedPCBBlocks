"""
Typed Schematics merger.

Generates full schematics from typed schematic blocks.

Usage:
  mergeTypedSchematics.py [--debug] [-i] JSON_FILE

Options:
  --debug    Debugging output.
  -i         Next argument is json input as comandline.
"""


import json
import os
import shutil
from docopt import docopt
from Swoop import Swoop

_debugMode = False
_arguments = ""

def debug_print(*args, sep=' ', end='\n', file=None):
    if _debugMode is True:
        print(*args, sep=sep, end=end, file=file)

def main(arguments):
    pyPath = os.path.dirname(os.path.realpath(__file__)) + "/"

    if arguments['-i'] is True:
        deviceConnections = json.loads(arguments['JSON_FILE'])
    else:
        with open(arguments['JSON_FILE'], 'r') as f:
            deviceConnections = json.loads(f.read())

    print(deviceConnections)

    schematic = Swoop.EagleFile.from_file(pyPath + 'typedSchematics/temperature_sensor.sch')
    net_names = Swoop.From(schematic).get_sheets().get_nets().get_name()
    print(net_names)

    # Rename nets
    # for net_name, connection in interface_info.items(): # each entry is a potential net
    #     if net_name in net_names:
    #         debug_print('Connecting net:', net_name, 'to', connection)
    #         # get the net
    #         net = (Swoop.
    #             From(unique_schematics[module_name]).
    #             get_sheets().
    #             get_nets().
    #             with_name(net_name)
    #         )[0]
    #         net.set_name(connection) # rename the net
    #         renamed_nets[module_name].add(connection)


if __name__ == '__main__':
    _arguments = docopt(__doc__, version='TypedSchematics merger v1.0')
    _debugMode = _arguments['--debug']
    debug_print(_arguments)
    main(_arguments)