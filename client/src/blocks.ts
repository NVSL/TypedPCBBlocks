/*
    Hardcoded blocks and images paths
*/

const PATH = './data/typedSchematics/';

type BlockType = 'powerRoot' | 'power' | 'computeModule' | 'peripheral'; // FIXME: Use tschda Blocktype interface

const LIST: Record<BlockType, { schematic: string; image: string }[]> = {
  powerRoot: [{ schematic: 'power5V12V.sch', image: 'power5V12V.png' }],
  power: [
    { schematic: 'power5V.sch', image: 'power5V.png' },
    { schematic: 'power3V3.sch', image: 'power3V3.png' },
  ],
  computeModule: [{ schematic: 'atmega328.sch', image: 'atmega328.png' }],
  peripheral: [
    { schematic: 'led_smd.sch', image: 'led_smd.png' },
    { schematic: 'tmperature_sensor.sch', image: 'temperature_sensor.png' },
    { schematic: 'flash.sch', image: 'flash.png' },
  ],
};

export { LIST, PATH, BlockType };
