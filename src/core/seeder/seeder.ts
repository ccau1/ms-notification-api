import * as glob from 'glob';
import * as path from 'path';
import chalk from 'chalk';
import * as readline from 'readline';
import mongoose from 'mongoose';

// THIS IS FOR SEEDING MONGO
export default class Seeder {
  _dataArray: Array<string | object> = [];
  _mongoose: null | mongoose.Connection = null;
  _connectFunction: (
    next: (connection: mongoose.Connection) => null,
  ) => void = () => null;
  _models: Array<string | (() => void)> = [];
  _clearAll = false;
  _clearCollectionList: Array<string> = [];
  _showLog = true;
  _isEnabled = true;
  _onlyPopulateEmptyCollection = false;
  _dataBasePath = '';
  _modelBasePath = '';
  _dataFileSuffixes: Array<string> = [];
  _dataFileSuffixStrict = false;
  _enableDbValidator = true;

  async init(cb) {
    if (!this._isEnabled) {
      return cb();
    }
    this.log('Seeder::init begins');

    // start connection (pre-load certain tasks)
    await this._connect(this._connectFunction);

    // load all models saved from addModel/addModels
    this._loadModels(this._models, this._modelBasePath);

    // handle clearing of collections
    if (this._clearAll) {
      const allMongooseKeys = Object.keys(this._mongoose.models);
      // this.log('Seeder::clear all collections', allMongooseKeys);
      await this._clearCollections(allMongooseKeys);
    } else if (this._clearCollectionList.length > 0) {
      // this.log('Seeder::clearing collections...');
      await this._clearCollections(this._clearCollectionList);
    }
    await this._populateDatas();
    // populate models with data set from addData/addDatas
    await this._populateModels(this._dataArray);
    this.log('Seeder::init completed\n');

    // seeding completed, callback
    cb();
  }

  async _populateDatas() {
    this._dataArray = await this._dataArray.reduce<
      Promise<Array<Promise<object> | object>>
    >(async (arr, data): Promise<Array<Promise<object> | object>> => {
      // if it is not a string, we assume it is
      // already generated as data so just
      // put into arr and return
      let dataArr = await arr;
      if (typeof data !== 'string') {
        dataArr.push(data);
        return dataArr;
      }
      // if it is a string, fetch all files from the string
      // using glob and add all data into arr
      if (this._dataFileSuffixes.length) {
        // remove js/json extension
        const dataFileStripped = data.replace(/\.(ts|js|json)$/, '');
        // path will run through glob to handle patterns
        const filePaths = await this._getFilePathArray(
          path.resolve(
            this._dataBasePath +
              dataFileStripped +
              `{${this._dataFileSuffixes.join(',')}${
                this._dataFileSuffixStrict || !this._dataFileSuffixes.length
                  ? ''
                  : ','
              }}`,
          ),
        );
        // add all found files into arr
        dataArr = dataArr.concat(filePaths);
      }
      // return new data array
      return dataArr;
    }, Promise.resolve([]));
  }

  async _clearCollections(modelNames) {
    // clear all documents from the collections listed in modelNames
    const clearTasks = modelNames.map(model => this._clearCollection(model));
    return Promise.all(clearTasks);
  }

  async _clearCollection(modelName) {
    // get the model in mongoose from the modelName
    const Model = this._mongoose.model(modelName);
    const me = this;

    // remove all items inside selected model
    return Model.deleteMany({}, {}, (err: mongoose.NativeError) => {
      if (err) {
        me.log(chalk.red('Error: ' + err.message));
        // return;
      } else {
        me.log(
          `Clear data for ${chalk
            .yellow(modelName)
            .padEnd(46, '.')} ${chalk.green('cleared')}`,
        );
      }
    });
  }

  async _populateModels(dataArray) {
    // for each item in the dataArray, populate model base on
    // data.model and data.documents
    for (const data of dataArray) {
      await this._populateModel(data.model, data.documents);
    }
  }

  async _populateModel(modelName, documents) {
    // get model from mongoose by modelName
    const Model = this._mongoose.model(modelName);

    // check if model already exists in db
    const isCollectionCreated = await Model.exists({});

    // if collection does not exist, create collection now
    if (!isCollectionCreated) {
      // ensure collection exists in db
      await Model.createCollection();
    }

    // if only populate on empty collection, then exit function
    // if docCount is bigger than 0
    if (this._onlyPopulateEmptyCollection) {
      const docCount = await Model.countDocuments();
      if (docCount > 0) {
        return;
      }
    }

    // for each document, add it to the model
    const errors = [];
    try {
      for (let i = 0; i < documents.length; i++) {
        try {
          await Model.updateOne(
            {
              _id: documents[i]._id,
            },
            documents[i],
            {
              upsert: true,
              runValidators: this._enableDbValidator,
            },
          );
          this.log(
            'Successfully created document [' +
              i +
              '] of ' +
              modelName +
              ' model',
          );
        } catch (err) {
          this.log(
            chalk.red(
              'Error creating document [' + i + '] of ' + modelName + ' model',
            ),
          );
          this.log(chalk.red('Error: ' + err.message));
          errors.push(err.message);
        }
      }
      // this.log('Successfully created documents of ' + modelName + ' model');
    } catch (err) {
      this.log(
        `Seed documents for ${chalk
          .yellow(modelName)
          .padEnd(40, '.')} ${chalk.red('Failed')}`,
        true,
      );
      this.log('Error: ' + err.message);
      // this.log(chalk.red('Error creating documents of '
      // + modelName + ' model'));
      // this.log(chalk.red('Error: ' + err.message));
      errors.push(err.message);
    }
    if (errors.length) {
      let errMessage = errors.length + ' seeding items failed\n';
      errors.forEach(err => {
        errMessage += err + '\n';
      });
      throw new Error(errMessage);
    }
  }

  async _connect(fn) {
    return new Promise(resolve => {
      fn(mongoose => {
        this._mongoose = mongoose;
        this.log('Seeder::connection completed');
        return resolve(mongoose);
      });
    });
  }

  _loadModels(models, basePath) {
    // Each model can either be a string (path) or a function
    // For each model, instantiate it
    models.forEach(model => {
      let modelFns = [model];
      // if model is a string (path), get the function from filepath
      if (typeof model === 'string') {
        const requires = glob.sync(basePath + model);
        modelFns = requires.map(r => require(path.resolve(r)));
      }
      // for each modelFn, test if they are function and if they
      // are, run it
      modelFns.forEach(modelFn => {
        // instantiate model
        if (typeof modelFn === 'function') {
          modelFn();
        }
        // if just declared schema, attach to db now
        if (typeof modelFn === 'object') {
          Object.values(modelFn).forEach(modelValue => {
            // TODO: should check for Schema object
            if ((modelValue as any)?.options?.collection) {
              this._mongoose.model(
                (modelValue as any).options.collection,
                modelValue as any,
              );
            }
          });
        }
        // instantiate model (with default)
        if (typeof modelFn?.default === 'function') {
          modelFn.default();
        }
      });
    });
    this.log('Seeder::model added: ', models);
  }

  dataBasePath(path) {
    this._dataBasePath = path;
    return this;
  }

  modelBasePath(path) {
    this._modelBasePath = path;
    return this;
  }

  log(msg: string, replacePreviousLine?: boolean) {
    if (this._showLog) {
      let displayMsg = msg;
      if (replacePreviousLine) {
        // clear current text
        readline.clearLine(undefined, 0);
        // move cursor to beginning of line
        readline.cursorTo(process.stdout, 0);
      } else {
        displayMsg = '\n' + displayMsg;
      }
      process.stdout.write(displayMsg);
      // console.info(msg);
    }
  }

  showLog(showLog = false) {
    this._showLog = showLog;
    return this;
  }

  isEnabled(isEnabled) {
    this._isEnabled = isEnabled;
    return this;
  }

  clearCollections(collectionNames) {
    // set list of collectionNames to clear
    this._clearCollectionList = this._clearCollectionList.concat(
      collectionNames,
    );
    return this;
  }

  clearCollection(collectionName) {
    // set a collectionName to clear
    this._clearCollectionList.push(collectionName);
    return this;
  }

  clearAllCollections(isClear = true) {
    // set whether system should clear all collections
    this._clearAll = isClear;
    return this;
  }

  connection(fn) {
    // set connection function (pre-load)
    this._connectFunction = fn;
    return this;
  }

  setDataFileSuffixStrict(isStrict = false) {
    this._dataFileSuffixStrict = isStrict;
    return this;
  }

  addDataFileSuffix(suffix) {
    if (!suffix) {
      throw new Error('addDataFileSuffix() require a suffix string');
    }
    this._dataFileSuffixes.push(suffix);
    return this;
  }

  addDatas(dataArrayList) {
    // add data to this._dataArray
    dataArrayList.forEach(dataArray => this.addData(dataArray));
    return this;
  }

  async _getFilePathArray(path) {
    // strip all js/json extension
    const dataPathStripped = path.replace(/\.(ts|js|json)$/, '');
    // fetch files relating to this glob
    const files = glob.sync(`${dataPathStripped}.{ts,js,json}`);
    // sort the file paths ASC
    files.sort();
    // generate regex for matching
    const regexFilePathBreakdown = new RegExp(
      `^(.*\\/)([\\w\\.]+)(${this._dataFileSuffixes
        .join('|')
        .replace(/\./i, '\\.')})\\.(ts|json|js)$`,
      'i',
    );

    const fileObjs = [];
    // go through all files
    for (let i = 0; i < files.length; i++) {
      // match current file to regex
      const match = files[i].match(regexFilePathBreakdown);
      if (match?.[3]) {
        // file is with suffix, remove non-suffix one

        // look forward to any non-suffix version and remove it
        for (let x = i + 1; x < files.length; x++) {
          // regex for finding filePath without suffix
          const regexString = `${match[1]}${match[2]}\\.(ts|json|js)`.replace(
            /\//g,
            '\\/',
          );
          // get whether file at x is the matched file path without suffix
          const isNonSuffixOne = new RegExp(regexString, 'i').test(files[x]);
          // if it is matched
          if (isNonSuffixOne) {
            // remove this file path
            files.splice(x, 1);
            // cheap way to end the for loop
            x = files.length;
          }
        }
      }
      // fetch file from filesystem
      const seedFile = require(files[i]);
      // add file obj to fileObjs
      fileObjs.push(seedFile.default || seedFile);
    }
    // return accumulated fileObjs
    return fileObjs;
  }

  addData(dataArray) {
    // add data to this._dataArray
    // if dataArray is a string
    if (typeof dataArray === 'string') {
      // just add the string to the dataArray
      this._dataArray.push(dataArray);
    } else {
      // else assume it is array and concat into dataArray
      this._dataArray = this._dataArray.concat(dataArray);
    }
    // always return this to chain other commands
    return this;
  }

  onlyPopulateEmptyCollection() {
    this._onlyPopulateEmptyCollection = true;
    return this;
  }

  registerModels(models) {
    // concat list of models to this._models
    this._models = this._models.concat(models);
    return this;
  }

  registerModel(model) {
    // add model to this._models
    this._models.push(model);
    return this;
  }

  enableDbValidator(isEnable = true) {
    this._enableDbValidator = isEnable;
    return this;
  }
}
