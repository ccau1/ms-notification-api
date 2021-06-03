import { Model, PaginateModel, Document } from "mongoose";
import _get from "lodash/get";
import _set from "lodash/set";

type Repository<Doc extends Document> =
  | Model<Doc>
  | PaginateModel<Doc>
  | { [field: string]: any };
export type ICustomPopulateFunction<T> = (
  doc: T,
  fields: { [key: string]: any }
) => Promise<T>;

export default class BaseService<Doc extends Document> {
  protected repository: Repository<Doc>;
  protected customPopulateFns: {
    [populatePath: string]: ICustomPopulateFunction<Doc>;
  } = {};

  constructor(repository: Repository<Doc>) {
    this.repository = repository;
  }

  protected async generateCode(
    text: string,
    options?: { requireUniqueCode?: boolean; dbField?: string }
  ): Promise<string> {
    const opts = {
      dbField: "code",
      ...options
    };
    const code = text
      .toString()
      .toLowerCase() //Create URL-Friendly String
      .trim()
      .replace(/[\s_]+/g, "-") // Replace spaces and underscore with -
      .replace(/&/g, "-and-") // Replace & with 'and'
      .replace(/[^\w\d\-]+/, "") // Remove all special characters
      .replace(/[\-]+/g, "-"); // Replace multiple - with single -

    if (!opts.requireUniqueCode) {
      return code;
    } else {
      //Retrieve the result with the largest number
      const existingCode = await this.repository
        .findOne({ [opts.dbField]: new RegExp(`^${code}(-([0-9]+))?$`, "i") })
        .sort({ [opts.dbField]: -1 });
      if (!existingCode) {
        return code;
      } else {
        const regex = new RegExp(`^${code}(-([0-9]+))?$`, "i");
        //An array with the text, -numbers and numbers
        //Ex: existingCode.code = "abc-123"
        //    existingCodeMatched = ["abc", "-123", "123"]
        const existingCodeMatched = existingCode[opts.dbField].match(regex);

        // Check if there are numbers after the text ("123")
        if (existingCodeMatched && !isNaN(parseInt(existingCodeMatched[2]))) {
          // If yes, add 1 to the number (123 => 124)
          const codify = `${code}-${parseInt(existingCodeMatched[2], 10) + 1}`;
          return codify;
        } else {
          // Otherwise, assign a number (-1)
          return `${code}-1`;
        }
      }
    }
  }

  /**
   * add a custom populate field
   *
   * @param populatePath field name to be populated
   * @param handleFn handler function, which return a mongoose.Document
   */
  protected async _addCustomPopulate(
    populatePath: string,
    handleFn: ICustomPopulateFunction<Doc>
  ) {
    this.customPopulateFns[populatePath] = handleFn;
  }

  /**
   * populate document based on fields defined in client side
   * @param docs mongoose document(s)
   * @param repo repository
   * @param populates array of fields to be populated
   */
  public async _populate<T = any>(
    docs: T,
    populates = [],
    options: {
      populateFields?: { [populatePath: string]: any };
      repo?: any;
    } = {}
  ): Promise<T | null> {
    const opts = {
      populateFields: {},
      ...options
    };
    // repo can be overwrite
    const repo = opts.repo || this.repository;

    if (populates.length) {
      // go through each populate to build a populate object array
      const populate = populates.reduce((popObj, popStr) => {
        // split the populate string by '.'
        const popParts = popStr.split(".");
        // regex for identifying non-populate fields (string starting with $)
        const nonPopulateRegex = /^\$\w+$/;
        // rebuilt path from according to populate or non-populate
        const currentPopObjKeyPath = [];
        // array of fields to be grouped for non-populate fields
        const groupField = [];

        for (const popPart of popParts) {
          // add to groupField
          groupField.push(popPart.replace("$", ""));
          // if not nonPopulate field, add to popObj
          if (!nonPopulateRegex.test(popPart)) {
            // add new path to current key path array
            currentPopObjKeyPath.push(groupField.join("."));
            // get existing field from current key path
            const existingField = _get(popObj, currentPopObjKeyPath);
            // if current key path not exist, add it
            if (!existingField) {
              _set(popObj, currentPopObjKeyPath, {});
            }
            // clear group field since we've used it
            groupField.splice(0);
          }
        }
        // return updated popObj
        return popObj;
      }, {});

      const buildPopulate = pop => {
        // for each item in pop object, create a populate structure
        return Object.keys(pop).map(o => ({
          path: o,
          populate: Object.keys(pop[o]).length
            ? buildPopulate(pop[o])
            : undefined
        }));
      };
      // build a recursive populate from basic populate object
      const builtPopulate = buildPopulate(populate);
      let result: any = docs;
      try {
        // run repo populate with built populate object
        result = await repo.populate(docs, builtPopulate);
      } catch (err) {}
      // go through each custom populate functions,
      // and update doc based on the function
      result = await Object.keys(this.customPopulateFns)
        .filter(populatePath => {
          return populates.some(p => {
            const regex = new RegExp(`^${populatePath.replace(/\$/g, "\\$")}`);
            return regex.test(p);
          });
        })
        .reduce(async (docsArrOrObj, customPopulateFnKey) => {
          const thisDoc = await docsArrOrObj;
          return Array.isArray(thisDoc)
            ? Promise.all(
                thisDoc.map(async d =>
                  this.customPopulateFns[customPopulateFnKey](
                    d,
                    opts.populateFields[customPopulateFnKey]
                  )
                )
              )
            : this.customPopulateFns[customPopulateFnKey](
                thisDoc,
                opts.populateFields[customPopulateFnKey]
              );
        }, result);
      // return document result
      return result;
    }
    // populates empty, so return original docs
    return docs;
  }
}
