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
import sys
import shutil
from docopt import docopt
from Swoop import Swoop

_debugMode = False
_arguments = ""

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

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


    # Get unique schematics and give them a unique number
    unique_schematics = {}
    unique_counter = 0
    for connections in deviceConnections:
        print(connections['connect'])
        for connection in connections['connect']:
            schematic = connection['schematic']
            if (schematic not in unique_schematics):
                unique_schematics[schematic] = "__u"+str(unique_counter)
                unique_counter+=1;

    print("UNIQUE SCHEMARICS: \n", unique_schematics)


    # Clone schematics and save them locally
    schematic_data= {}
    for schematic in unique_schematics:
        data = Swoop.EagleFile.from_file(pyPath + "typedSchematics/" + schematic + '.sch')
        schematic_data[schematic] = data

    # Connect Nets
    for connections in deviceConnections:
        # Create renamed net name
        renamedNet = ''
        for connection in connections['connect']:
            if renamedNet != '':
                renamedNet += '+' + connection['net']
            else:
                renamedNet += connection['net']
        # Rename net
        for connection in connections['connect']:
            net = (Swoop.
                From(schematic_data[connection['schematic']]).
                get_sheets().
                get_nets().
                with_name(connection['net']))[0]
            net.set_name(renamedNet)

    # Make rest of nets unique
    for schematic in unique_schematics:
        for net in Swoop.From(schematic_data[schematic]).get_sheets().get_nets():
            if ('+' not in net.name):
                net.set_name(net.name+unique_schematics[schematic])
            print(schematic, net.name)

    # Make parts library unique
    for schematic in unique_schematics:
        for part in Swoop.From(schematic_data[schematic]).get_parts():
            print('Looking at part:', part)
            old_name = part.name
            schematic_data[schematic].remove_part(part)
            part.name = old_name + '_' + unique_schematics[schematic]
            schematic_data[schematic].add_part(part)

            for instance in Swoop.From(schematic_data[schematic]).get_sheets().get_instances():
                    # print('instance:', instance.part)
                    if instance.part == old_name:
                        instance.part = part.name

            for pinref in Swoop.From(schematic_data[schematic]).get_sheets().get_nets().get_segments().get_pinrefs():
                # print('pinref:', pinref)
                if pinref.part == old_name:
                    pinref.part = part.name
        # print(Swoop.From(schematic_data[schematic]).get_libraries().get_devicesets())

    # debug_print('Renamed all parts, verifying')

    
    emptySchematic = Swoop.EagleFile.from_file(pyPath + 'typedSchematics/_emptyTemplate.sch')
    print(emptySchematic)

    for schematic in unique_schematics:
        sheets = schematic_data[schematic].get_sheets()
        print(sheets)
        for sheet in sheets:
            emptySchematic.add_sheet(sheet)

        for part in schematic_data[schematic].get_parts():
            library_name = part.get_library()
            library = schematic_data[schematic].get_library(library_name)
            print("library", library.__dict__)
            # devicesets = library.get_devicesets()
            # print("DeviceSets:", devicesets)
            # print(library)
            emptySchematic.add_part(part)
            emptySchematic.add_library(library)
            print("////", (Swoop.From(emptySchematic).get_libraries()).count())
            # 
            # for deviceset in devicesets:
            #     library.add_deviceset(deviceset)

        # for deviceset in Swoop.From(schematic_data[schematic]).get_libraries().get_devicesets():
        #     emptySchematic.add_deviceset(deviceset)
        
    # print(emptySchematic.get_sheets())

    # Todo: R4__U1 not found

    print("---")
    print("---")
    print(Swoop.From(emptySchematic).get_libraries())

    # for deviceset in Swoop.From(emptySchematic).get_libraries().get_devicesets():
    #     print(deviceset)

    # emptySchematic.write(pyPath + 'Combined.sch')


if __name__ == '__main__':
    _arguments = docopt(__doc__, version='TypedSchematics merger v1.0')
    _debugMode = _arguments['--debug']
    debug_print(_arguments)
    main(_arguments)