"""
Typed Schematics merger.

Generates full schematics from typed schematic blocks.

Usage:
  mergeTypedSchematics.py [--debug] [-i] JSON_FILE [-p] TSCHS_PATH

Options:
  --debug    Debugging output.
  -i         Next argument is json input as comandline.
  -p         Typed Schematics path
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
_schematicsPath = "/"
_templatesPath = 'templates/'
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


##### BRD START
def rebuildBoardConnections(sch, brd):
    """
    Update the signals in :code:`brd` to match the nets in :code:`sch`.  This will set up the connections, but won't draw the air wires.  You can use Eagle's :code:`ripup` command to rebuild those.

    :param sch: :class:`SchematicFile` object and source of the connection information.
    :param brd: :class:`BoardFile` destination for then connection information.
    :rtype: :code:`None`
    
    """
    #sheets/*/net.name:
    for name in Swoop.From(sch).get_sheets().get_nets().get_name():
        sig =  brd.get_signal(name)
        if sig is None:
            brd.add_signal(Swoop.Signal().
                           set_name(name).
                           set_airwireshidden(False).
                           set_class("0")) # We need to do something smarter here.
        else:
            sig.clear_contactrefs()

        for pinref in (Swoop.From(sch).
                       get_sheets().
                       get_nets().
                       with_name(name).
                       get_segments().
                       get_pinrefs()):

            try:
                if sch.get_part(pinref.part).find_device().get_package() is None:
                    continue
            except:
                continue

            pads = (Swoop.From(sch).
                   get_parts().
                   with_name(pinref.get_part()).
                   find_device().
                   get_connects().
                   with_gate(pinref.gate).
                   with_pin(pinref.pin).
                   get_pads())

            assert pads is not None;
            if pads is None:
                eprint("Can't find pads for '{}:{}.{}' on net '{}'".format(pinref.get_part(), pinref.gate, pinref.pin, name))

            for pad in pads:
                brd.get_signal(name).add_contactref(Swoop.Contactref().
                                                    set_element(pinref.get_part()).
                                                    set_pad(pad))

def propagatePartToBoard(part, brd):

    """
    Copy :code:`part` to ``brd`` by creating a new :class:`Element` and populating it accordingly.
    If the part already exists, it will be replaced.  Attributes are not displayed by default, but the display layer is set to "Document".
    
    If the library for the part is missing in the board, it will be create.  If the package is missing, it will be copied.  If it exists and the package for the part and the package in the board are not the same, raise an exception.

    .. Note::
       This function doesn't update the board's signals.  You can run :meth:`rebuildBoardConnections` to do that.

    :param part: :class:`Part` object that to propagate.
    :param brd: Destination :class`BoardFile`.
    :rtype: :code:`None`

    """
    try:
        if part.find_device().get_package() is None:
            return
    except:
        return
    
    if part.find_package() is None:
        raise Swoop.SwoopError("Can't find package for '{}' ({}.{}.{}.{}).".format(part.get_name(), part.get_library(), part.get_deviceset(), part.get_device(), part.get_technology()))

    dst_lib = brd.get_library(part.get_library())

    if dst_lib is None:
        dst_lib = Swoop.Library().set_name(part.get_library())
        brd.add_library(dst_lib)

    #src_lib = part.find_library()
    #assert src_lib is not None, "Missing library '{}' for part '{}'".format(part.get_library(), part.get_name())
    
    dst_package = dst_lib.get_package(part.find_package().get_name())
    if dst_package is None:
        dst_package = part.find_package().clone()
        dst_lib.add_package(dst_package)
    else:
        assert dst_package.is_equal(part.find_package()), "Package from schematic is not the same as package in board"

    # Reverse-engineered logic about setting values in board files.
    if part.find_deviceset().get_uservalue():
        fallback_value = ""
    else:
        fallback_value = part.get_deviceset()+part.get_device()
    
    n =(Swoop.Element().
        set_name(part.get_name()).
        set_library(part.get_library()).
        set_package(part.
                    find_package().
                    get_name()).
        set_value(part.get_value() if part.get_value() is not None else fallback_value).
        set_x(0).
        set_y(0))

    brd.add_element(n)


def build_board_from_schematic(sch, template_brd):
    """
    Create a minimal board from a schematic file.  :code:`template_brd` is modified and returned.
    
    :param sch: the input schematic
    :param brd: a template :class:`BoardFile`
    :returns: A :class:`BoardFile` object that is consistent with the schematic.
    """
    for part in sch.get_parts():
        propagatePartToBoard(part, template_brd)

    rebuildBoardConnections(sch, template_brd)
    return template_brd

#####  BRD END

def main(arguments):
    pyPath = os.path.dirname(os.path.realpath(__file__)) + "/"

    if arguments['-i'] is True:
        deviceConnections = json.loads(arguments['JSON_FILE'])
    else:
        with open(arguments['JSON_FILE'], 'r') as f:
            deviceConnections = json.loads(f.read())

    if arguments['-p'] is True:
         _schematicsPath = arguments['TSCHS_PATH']

    print(_schematicsPath)

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
        data = Swoop.EagleFile.from_file(pyPath + _schematicsPath + schematic)
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
    emptySchematic = Swoop.EagleFile.from_file(pyPath + _templatesPath + '_emptyTemplate.sch')
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



    # # Make board from schematic
    # brdTemplate = Swoop.EagleFile.from_file(pyPath + _templatesPath + '_emptyTemplate.brd')
    # board = build_board_from_schematic(emptySchematic, brdTemplate)

    # # Transfer modules designs
    # for prefix, dicValue in unique_schematics.items():
    #     schematic = dicValue["schematic"]
    #     debug_print(dicValue['schematic'], prefix,":")
    #     moduleBrd = Swoop.EagleFile.from_file(pyPath + _schematicsPath + schematic +'.brd')
    #     for moduleEleName,moduleEle in moduleBrd.elements.items():
    #         print(moduleEleName, moduleEle.name, moduleEle.x, moduleEle.y)
    #         for boardEleName,boardEle in board.elements.items():
    #             if (boardEleName == moduleEleName+prefix ):
    #                 print("Found!", boardEleName)
    #                 # Copy element postions
    #                 boardEle.x = moduleEle.x
    #                 boardEle.y = moduleEle.y
    #                 boardEle.rot = moduleEle.rot
    #         # TODO: Add signals, attribute names and define a X position (maybe from json)
    
    # # Write final board file
    # board.write(pyPath + 'COMBINED.brd')

    

if __name__ == '__main__':
    _arguments = docopt(__doc__, version='TypedSchematics merger v1.0')
    _debugMode = _arguments['--debug']
    main(_arguments)