// // inject env variable first
require('dotenv').config({ path: './.env' });
import { existsSync } from 'fs';
import mongoose from 'mongoose';
import Seeder from './core/seeder/seeder';
import mongoConnectionString from './core/mongo/mongoConnectionString';

const enabled = process.env.SEED_ENABLE === 'true';

const basePath = existsSync('./src') ? 'src/' : 'dist/';

const registerModels = [
  `${existsSync('./src') ? 'src/' : 'dist/'}/modules/**/*.schema{,s}.{ts,js}`,
];

new Seeder()
  // set seeding enabled or not
  .isEnabled(enabled)
  // whether show detail message
  .showLog(process.env.SEED_SHOW_LOG === 'true')
  // define whether db should use schema to handle validation
  .enableDbValidator(true)
  // function to start mongodb connection
  .connection(next => {
    mongoose
      .connect(mongoConnectionString, {
        useCreateIndex: true,
        useNewUrlParser: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
      })
      .then(({ connection }) => next(connection));
  })
  // clear collections before seed or not
  .clearAllCollections(process.env.SEED_CLEAR_ALL_COLLECTIONS === 'true')
  // base path
  .dataBasePath(basePath)
  // suffix for seed file (env specific seeding)
  .addDataFileSuffix(`.${process.env.NODE_ENV || 'development'}`)
  // force using suffix
  .setDataFileSuffixStrict(false)
  // path pattern for seed files
  .addData(['modules/**/{*.,*}seed', 'seeds/**/{*.,*}seed'])
  // base register path
  .modelBasePath('')
  // register mongoose models
  .registerModels(registerModels)
  // execute seeding
  .init(() => {
    if (enabled) {
      console.info('Seeding completed.');
    }
  })
  // seeding complete
  .then(() => process.exit(0))
  // seeding failed
  .catch(err => {
    if (enabled) {
      console.error('Seeding failed.');
    }
    console.error(err);

    process.exit(1);
  });
