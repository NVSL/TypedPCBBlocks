import fs from 'fs-extra';
import { spawn } from 'child_process';

// Generate PCB
const generateSchematic = (req, res) => {
  console.log('\n######\n###### Generating Schematic \n######');
  console.log('INPUT:\n', JSON.stringify(req.body.schData, null, 2));
  res.status(200).send('OK');

  //   // Delete combined output if exists
  //   let routedCombinedFilePath = './schematicToTyped/mergeOutput/merged.sch';
  //   if (fs.existsSync(routedCombinedFilePath)) {
  //     fs.unlinkSync(routedCombinedFilePath);
  //   }

  //   // Delete any *.pro file
  //   let regex = /[.]pro$/;
  //   let path = '../../json_to_eagle_brd/';
  //   fs.readdirSync(path)
  //     .filter((f) => regex.test(f))
  //     .map((f) => fs.unlinkSync(path + f));

  // Delete any *.sch file
  const regex = /[.]sch$/;
  const path = './schematicToTyped/mergeOutput/';
  fs.readdirSync(path)
    .filter((f) => regex.test(f))
    .map((f) => fs.unlinkSync(path + f));

  //   // Run Gadgetron modules combinator
  //   let spawn = require('child_process').spawn;
  //   let pyprog = spawn('python3', [
  //     '../../json_to_eagle_brd/builder.py',
  //     '-i',
  //     JSON.stringify(req.body.pcbInput),
  //   ]);

  //   pyprog.stderr.on('data', (data) => {
  //     // Data error
  //     console.log('\nDATA ERROR:\n', data.toString('utf8'));
  //   });

  //   pyprog.stdout.on('data', function (data) {
  //     console.log('\nDATA GOOD:\n', data.toString('utf8'));
  //   });

  //   pyprog.on('exit', function (code) {
  //     if (code == '0') {
  //       // Process finish correctly
  //       try {
  //         // Get PCB, if it doesn't exist then combined board failed.
  //         fs.readFileSync('../../json_to_eagle_brd/COMBINED.brd', 'utf8');
  //       } catch (err) {
  //         console.log(err.stack);
  //         res.status(500).send({ error: 'Server error' });
  //         console.log('\n######\n###### END Generating PCB (Fail) \n######');
  //         return;
  //       }
  //       res.send({ message: 'Success' });
  //       console.log('\n######\n###### END Generating PCB (Success) \n######');
  //     } else {
  //       // Process error
  //       res.status(500).send({ error: 'Server error' });
  //       console.log('\n######\n###### END Generating PCB (Fail) \n######');
  //     }
  //   });
};

export { generateSchematic };
