import { runMorning } from './runMorning.js';

runMorning()
  .then(result => console.log(JSON.stringify(result)))
  .catch(error => {
    console.error(error.stack || error);
    process.exit(1);
  });
