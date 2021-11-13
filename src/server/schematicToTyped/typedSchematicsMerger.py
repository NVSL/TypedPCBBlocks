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
_uniquePrefix = "__u"
_mergedSchematicName = "Combined.sch"
_reservedNets = ["GND"]

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

def debug_print(*args, sep=' ', end='\n', file=None):
    if _debugMode is True:
        print(*args, sep=sep, end=end, file=file)

def schematicIsUnique(unique_schematics, schematic, instance):
    if (len(unique_schematics) == 0):
        return True
    for unique in unique_schematics:
        if (unique["schematic"] == schematic and unique["instance"] == instance):
            return False
    return True

def getPrefix(unique_schematics, schematic, instance):
    for unique in unique_schematics:
        if (unique["schematic"] == schematic and unique["instance"] == instance):
            return unique["prefix"]

def main(arguments):
    pyPath = os.path.dirname(os.path.realpath(__file__)) + "/"

    if arguments['-i'] is True:
        deviceConnections = json.loads(arguments['JSON_FILE'])
    else:
        with open(arguments['JSON_FILE'], 'r') as f:
            deviceConnections = json.loads(f.read())

    # Get unique schematics and give them a unique number
    unique_schematics = []
    unique_counter = 0
    for connections in deviceConnections:
        for connection in connections['connect']:
            if (schematicIsUnique(unique_schematics, 
                connection['schematic'],
                connection['instance'])):
                # TODO: Order dictionary by prefix
                unique_schematics.append(
                    {"schematic": connection['schematic'], 
                    "instance": connection["instance"], 
                    "prefix": _uniquePrefix+str(unique_counter)})
                unique_counter+=1;
    debug_print(">> Unique schematics: \n", unique_schematics)

    # Clone schematics and save them locally
    schematic_data= {}
    for unique in unique_schematics:
        schematic = unique["schematic"]
        data = Swoop.EagleFile.from_file(pyPath + "typedSchematics/" + schematic + '.sch')
        # TODO: Order schematic data by prefix
        schematic_data[schematic] = data

    # Connect Nets
    debug_print(">> Renamed connected nets per schematic:")
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
            # TODO: use getPrefix
            net = (Swoop.
                From(schematic_data[connection['schematic']]).
                get_sheets().
                get_nets().
                with_name(connection['net']))[0]
            net.set_name(renamedNet)
            debug_print(connection['schematic'],":", renamedNet)

    # Make rest of nets unique
    debug_print(">> Renamed rest of nets per schematic:")
    for schematic in unique_schematics:
        debug_print(schematic,":")
        for net in Swoop.From(schematic_data[schematic]).get_sheets().get_nets():
            debug_print(" -----> NET :", net.name)
            if (('+' not in net.name) and (net.name not in _reservedNets)):
                renamedNet = net.name+unique_schematics[schematic]
                net.set_name(renamedNet)
                debug_print(" RENAMED TO :", renamedNet)

    # Make parts unique
    debug_print(">> Renamed parts per schematic:")
    for schematic in unique_schematics:
        for part in Swoop.From(schematic_data[schematic]).get_parts():
            # print('Looking at part:', part)
            old_name = part.name
            schematic_data[schematic].remove_part(part)
            part.name = old_name + unique_schematics[schematic]
            schematic_data[schematic].add_part(part)

            if part.library is not None:
                part.library = part.library + unique_schematics[schematic]
            if part.library_urn is not None:
                part.library_urn = part.library_urn + unique_schematics[schematic]

            for instance in Swoop.From(schematic_data[schematic]).get_sheets().get_instances():
                    if instance.part == old_name:
                        instance.part = part.name

            for pinref in Swoop.From(schematic_data[schematic]).get_sheets().get_nets().get_segments().get_pinrefs():
                if pinref.part == old_name:
                    pinref.part = part.name

            debug_print(schematic,":",
                "\n Part name:", part.name,
                "\n Part library:", part.library,
                "\n Part library_urn:", part.library_urn)

    # Make libraries unique
    debug_print(">> Renamed libraries per schematic:")
    for schematic in unique_schematics:
        for library in schematic_data[schematic].get_libraries():
            library.name = library.name + unique_schematics[schematic]
            schematic_data[schematic].add_library(library)
            if (library.urn is not None):
                library.urn = library.urn + unique_schematics[schematic]
                
            debug_print(schematic,":", 
                "\n Library name :", library.name,
                "\n Library urn:", library.urn)
    
    ## Merge schematics into schematic template
    debug_print(">> Writing")
    emptySchematic = Swoop.EagleFile.from_file(pyPath + 'typedSchematics/_emptyTemplate.sch')
    for schematic in unique_schematics:
        debug_print(schematic,":")
        sheets = schematic_data[schematic].get_sheets()
        for idx, sheet in enumerate(sheets):
            debug_print(" Adding sheet :", idx)
            emptySchematic.add_sheet(sheet)

        for part in schematic_data[schematic].get_parts():
            library_name = part.get_library()
            library = schematic_data[schematic].get_library(library_name)
            debug_print(" Adding part :", part.name)
            emptySchematic.add_part(part)
            debug_print(" Adding library :", library.name)
            emptySchematic.add_library(library)

    # Save new schematic
    emptySchematic.write(pyPath + _mergedSchematicName)



    ################ Board Merger ####################
    # TODO: Add this to another file


    

if __name__ == '__main__':
    _arguments = docopt(__doc__, version='TypedSchematics merger v1.0')
    _debugMode = _arguments['--debug']
    main(_arguments)