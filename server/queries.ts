import fs from 'fs-extra';
import { spawn } from 'child_process';

// Generate PCB
const generateSchematic = (req, res) => {
  console.log('\n######\n###### Generating Schematic \n######');
  console.log('INPUT:\n', JSON.stringify(req.body.schData, null, 2));

  // Merge output path
  const outputPath = './scripts/mergeOutput/';
  const outputName = 'merged.sch';
  const tschPath = '../data/typedSchematics/';

  // Delete any *.pro file
  fs.readdirSync(outputPath)
    .filter((f) => /[.]pro$/.test(f))
    .map((f) => fs.unlinkSync(outputPath + f));

  // Delete any *.sch file
  fs.readdirSync(outputPath)
    .filter((f) => /[.]sch$/.test(f))
    .map((f) => fs.unlinkSync(outputPath + f));

  // Run schematic merger
  const pyprog = spawn('python3', [
    './scripts/typedSchematicsMerger.py',
    '-i',
    JSON.stringify(req.body.schData),
    '-p',
    tschPath,
  ]);

  pyprog.stderr.on('data', (data) => {
    // Data error
    console.log('\nDATA ERROR:\n', data.toString('utf8'));
  });

  pyprog.stdout.on('data', function (data) {
    console.log('\nDATA GOOD:\n', data.toString('utf8'));
  });

  pyprog.on('exit', function (code) {
    console.log('Code exit', code);
    if (code == 0) {
      // Process finish correctly
      try {
        // Get PCB, if it doesn't exist then combined board failed.
        const data = fs.readFileSync(outputPath + outputName, 'utf8');
        res.status(200).send({ schematic: data });
        console.log('\n######\n###### END Generating PCB (Success) \n######');
      } catch (err) {
        console.log(err);
        res.status(500).send({ error: 'Server error' });
        console.log('\n######\n###### END Schematic PCB (Fail) \n######');
        return;
      }
    } else {
      // Process error
      res.status(500).send({ error: 'Server error' });
      console.log('\n######\n###### END Schematic PCB (Fail) \n######');
    }
  });
};

export { generateSchematic };
