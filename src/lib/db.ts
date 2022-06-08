import { Level } from 'level';

function init() {
  let dbPath: string = 'acuity-dex-app'
  console.log('Initializing database: ' + dbPath)
  return new Level(dbPath)
}

export default { init }
