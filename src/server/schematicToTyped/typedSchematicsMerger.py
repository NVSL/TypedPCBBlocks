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
    if unique_schematics:
        for data in unique_schematics.values():
            if (data["schematic"] == schematic and data["instance"] == instance):
                return False
    return True

def getPrefix(unique_schematics, schematic, instance):
    if unique_schematics:
        for key,data in unique_schematics.items():
            if (data["schematic"] == schematic and data["instance"] == instance):
                return key

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
        for connection in connections['connect']:
            if (schematicIsUnique(unique_schematics, 
                connection['schematic'],
                connection['instance'])):
                # Order unique schematics by prefix
                prefix = _uniquePrefix+str(unique_counter)
                unique_schematics[prefix] = {
                    "schematic": connection['schematic'], 
                    "instance": connection["instance"]}
                unique_counter+=1;
    debug_print(">> Unique schematics: \n", unique_schematics)

    # Clone schematics and save them locally
    schematic_data= {}
    for prefix, dicValue in unique_schematics.items():
        schematic = dicValue["schematic"]
        data = Swoop.EagleFile.from_file(pyPath + "typedSchematics/" + schematic + '.sch')
        schematic_data[prefix] = data
    debug_print(">> Schematic data: \n", schematic_data)

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
            prefix = getPrefix(unique_schematics, connection['schematic'], connection['instance'])
            net = (Swoop.
                From(schematic_data[prefix]).
                get_sheets().
                get_nets().
                with_name(connection['net']))[0]
            net.set_name(renamedNet)
            debug_print(connection['schematic'], prefix,":", renamedNet)

    # Make rest of nets unique
    debug_print(">> Renamed rest of nets per schematic:")
    for prefix, dicValue in unique_schematics.items():
        debug_print(dicValue['schematic'],prefix,":")
        for net in Swoop.From(schematic_data[prefix]).get_sheets().get_nets():
            debug_print(" -----> NET :", net.name)
            if (('+' not in net.name) and (net.name not in _reservedNets)):
                renamedNet = net.name+prefix
                net.set_name(renamedNet)
                debug_print(" RENAMED TO :", renamedNet)
            else:
                debug_print(" RENAMED TO :", "<SKIPPED>")

    # Make parts unique
    debug_print(">> Renamed parts per schematic:")
    for prefix, dicValue in unique_schematics.items():
        for part in Swoop.From(schematic_data[prefix]).get_parts():
            old_name = part.name
            schematic_data[prefix].remove_part(part)
            part.name = old_name + prefix
            schematic_data[prefix].add_part(part)

            if part.library is not None:
                part.library = part.library + prefix
            if part.library_urn is not None:
                part.library_urn = part.library_urn + prefix

            for instance in Swoop.From(schematic_data[prefix]).get_sheets().get_instances():
                    if instance.part == old_name:
                        instance.part = part.name

            for pinref in Swoop.From(schematic_data[prefix]).get_sheets().get_nets().get_segments().get_pinrefs():
                if pinref.part == old_name:
                    pinref.part = part.name

            debug_print(dicValue['schematic'],prefix,":",
                "\n Part name:", part.name,
                "\n Part library:", part.library,
                "\n Part library_urn:", part.library_urn)


    # Make libraries unique
    debug_print(">> Renamed libraries per schematic:")
    for prefix, dicValue in unique_schematics.items():
        for library in schematic_data[prefix].get_libraries():
            library.name = library.name + prefix
            schematic_data[prefix].add_library(library)
            if (library.urn is not None):
                library.urn = library.urn + prefix
                
            debug_print(dicValue['schematic'],prefix,":", 
                "\n Library name :", library.name,
                "\n Library urn:", library.urn)
    

    ## Merge schematics into schematic template
    debug_print(">> Writing")
    emptySchematic = Swoop.EagleFile.from_file(pyPath + 'typedSchematics/_emptyTemplate.sch')
    for prefix, dicValue in unique_schematics.items():
        debug_print(dicValue['schematic'],":")
        sheets = schematic_data[prefix].get_sheets()
        for idx, sheet in enumerate(sheets):
            debug_print(" Adding sheet :", idx)
            emptySchematic.add_sheet(sheet)

        for part in schematic_data[prefix].get_parts():
            library_name = part.get_library()
            library = schematic_data[prefix].get_library(library_name)
            debug_print(" Adding part :", part.name)
            emptySchematic.add_part(part)
            debug_print(" Adding library :", library.name)
            emptySchematic.add_library(library)

    # Save new schematic
    emptySchematic.write(pyPath + _mergedSchematicName)
    debug_print(">> Schematic write succesfully!")


    ################ Board Merger ####################
    # TODO: Add this to another file


    

if __name__ == '__main__':
    _arguments = docopt(__doc__, version='TypedSchematics merger v1.0')
    _debugMode = _arguments['--debug']
    main(_arguments)