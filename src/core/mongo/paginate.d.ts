// Type definitions for paginate 5.0.0
// Project: https://github.com/edwardhotchkiss/paginate
// Definitions by: Linus Brolin <https://github.com/linusbrolin>, simonxca <https://github.com/simonxca>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.3

/// <reference types="mongoose" />

declare module 'mongoose' {
  export interface PaginateOptions {
    select?: object | string;
    sort?: object | string;
    populate?: Array<object> | Array<string> | object | string;
    lean?: boolean;
    leanWithId?: boolean;
    offset?: number;
    page?: number;
    limit?: number;
    collation?: object;
    customLabels?: {
      totalDocs?: string;
      limit?: string;
      page?: string;
      totalPages?: string;
      docs?: string;
      nextPage?: string;
      prevPage?: string;
    };
  }

  export interface PaginateResult<T> {
    docs: Array<T>;
    total: number;
    limit: number;
    page?: number;
    pages?: number;
    offset?: number;
    isEnd?: boolean;
    hasPrevPage?: boolean;
    hasNextPage?: boolean;
    [n: number]: any;
    [key: string]: Array<any> | number | boolean;
  }

  export interface PaginateModel<T extends Document> extends Model<T> {
    paginate(
      query?: object,
      options?: PaginateOptions,
      callback?: (err: any, result: PaginateResult<T>) => void
    ): Promise<PaginateResult<T>>;
    options: PaginateOptions;
  }

  export interface Paginate {
    (query: object, options: PaginateOptions, callback: (result) => void): Promise<any>;
    options?: PaginateOptions;
  }

  export class PaginateOptionsQueryModel {
    sort?: object | string;
    populate?: Array<object> | Array<string> | object | string;
    offset?: number;
    page?: number;
    limit?: number;
  }

  export function model<T extends Document>(name: string, schema?: Schema, collection?: string, skipInit?: boolean): PaginateModel<T>;

  export function model<T extends Document, U extends PaginateModel<T>>(
    name: string,
    schema?: Schema,
    collection?: string,
    skipInit?: boolean
  ): U;
}

declare module 'paginate' {
  import mongoose = require('mongoose');
  const _: (schema: mongoose.Schema) => void;
  export = _;
}
