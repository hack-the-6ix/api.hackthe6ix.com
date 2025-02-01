import { IUser } from '../models/user/fields';
import { getInTextSearchableFields } from '../models/util';
import { jsonify, log } from '../services/logger';
import {
  CreateCheckRequest,
  DeleteCheckRequest,
  ReadCheckRequest,
  WriteCheckRequest,
} from '../types/checker';
import {
  BadRequestError,
  CreateDeniedError,
  DeleteDeniedError,
  WriteDeniedError,
} from '../types/errors';
import { escapeStringRegexp, evaluateChecker } from './util/checker';
import { fetchUniverseState, getModels } from './util/resources';

/**
 * Recursively traverses the schema fields + permission checker and the object in parallel
 * to filter out data that should not appear in the output.
 *
 * @param rawField - fields interlaced with read/write checkers at each level
 * @param object
 * @param request
 */
export const cleanObject = (
  rawFields: any,
  object: any,
  request: ReadCheckRequest<any>,
) => {
  const out: any = {};

  if (!rawFields || !object) {
    throw new BadRequestError('Field or object is not truthy!');
  }

  // If the user cannot read fields at this level, we don't need to check any further
  if (evaluateChecker(rawFields.readCheck, request)) {
    for (const k of Object.keys(rawFields.FIELDS)) {
      const fieldMetadata = rawFields.FIELDS[k];

      if (fieldMetadata) {
        if (fieldMetadata.FIELDS !== undefined) {
          if (evaluateChecker(fieldMetadata.readCheck, request)) {
            // This is another nested dictionary, so we can recurse
            out[k] = cleanObject(fieldMetadata, object[k], request);
          }
        } else {
          // This is just a regular field, so we'll check to make sure we have access to that field

          if (evaluateChecker(fieldMetadata.readCheck, request)) {
            // Handle read interceptor
            if (!fieldMetadata.readInterceptor) {
              out[k] = object[k];
            } else {
              out[k] = fieldMetadata.readInterceptor({
                fieldValue: object[k],
                ...request,
              });
            }
          }
        }
      }
    }
  }

  return out;
};

/**
 * Fetch an object and the total number of the objects with mongo query
 *
 * @param requestUser
 * @param objectTypeName
 * @param query - { page?: number, size?: number, sortField?: string, sortCriteria?: 'asc' | 'desc', text?: string, filter?: any }
 */
export const getObject = async (
  requestUser: IUser,
  objectTypeName: string,
  query: {
    page?: string;
    size?: string;
    sortField?: string;
    sortCriteria?: 'asc' | 'desc';
    text?: string;
    filter?: any;
  },
) => {
  // Since this function can handle any model type, we must fetch the mongoose schema first
  const objectModel: any = (getModels() as any)[objectTypeName];

  if (objectModel === undefined) {
    throw new BadRequestError('Invalid Object Type');
  }

  // Sanitize data before sending it out into the world
  if (!query) {
    throw new BadRequestError('Must specify query!');
  }

  // Default to page 1
  if (query.page === undefined) {
    query.page = '1';
  }

  // Default to a query size of 10k
  if (query.size === undefined) {
    query.size = '10000';
  }

  const page = query.page ? parseInt(query.page) : -1;
  const size = query.size ? parseInt(query.size) : -1;

  if (page <= 0 || !page) {
    throw new BadRequestError('Page must be >= 1!');
  }

  if (size <= 0 || !size) {
    throw new BadRequestError('Size must be >= 1!');
  }

  const filters: any = query.filter || {};
  const and: { [k: string]: RegExp }[] = [];
  const or: { [k: string]: RegExp }[] = [];

  // Sort
  const sort: any = {};

  if (query.sortCriteria && !['asc', 'desc'].includes(query.sortCriteria)) {
    throw new BadRequestError('Invalid sort criteria! Must be asc or desc!!');
  }

  if (query.sortField && query.sortCriteria) {
    sort[query.sortField] = query.sortCriteria;
  }

  // In text search
  const text = query.text;
  if (text) {
    const regex = new RegExp(escapeStringRegexp(text), 'i'); // filters regex chars, sets to case insensitive

    const inTextSearchFields = getInTextSearchableFields(
      objectModel.rawFields,
      text,
    );

    // Apply regex against fields with in text search
    for (const f of inTextSearchFields) {
      const textQuery: any = {};

      textQuery[f] = regex;

      or.push(textQuery);
    }
  }

  if (or && or.length) {
    if ('$or' in filters) {
      filters['$or'].concat(or);
    } else {
      filters['$or'] = or;
    }
  }

  if (and && and.length) {
    if ('$and' in filters) {
      filters['$and'].concat(and);
    } else {
      filters['$and'] = and;
    }
  }

  const results = await objectModel.mongoose
    .find(filters)
    .sort(sort)
    .skip((page - 1) * size)
    .limit(size);

  const out: any[] = [];

  const universeState = await fetchUniverseState();

  // Perform all the traversals async
  const cleanedResults = results.map((result: any) =>
    cleanObject(objectModel.rawFields, result, {
      requestUser: requestUser,
      targetObject: result,
      universeState: universeState,
    }),
  );

  for (const cleanedResult of cleanedResults) {
    // Only push it into the output if there is any data left
    if (cleanedResult && Object.keys(cleanedResult).length > 0) {
      out.push(cleanedResult);
    }
  }

  return out;
};

/**
 * Fetch an object with mongo query
 *
 * WARNING: Only allow admins/trusted users to have unfiltered access this function. It may be possible to have
 *          arbitrary code execution if care is not taken.
 *
 * @param requestUser
 * @param objectTypeName
 * @param query - { page?: number, size?: number, sortField?: string, sortCriteria?: 'asc' | 'desc', text?: string, filter?: any }
 */
export const getObjectV2 = async (
  requestUser: IUser,
  objectTypeName: string,
  query: {
    page?: string;
    size?: string;
    sortField?: string;
    sortCriteria?: 'asc' | 'desc';
    text?: string;
    filter?: any;
  },
) => {
  // Since this function can handle any model type, we must fetch the mongoose schema first
  const objectModel: any = (getModels() as any)[objectTypeName];

  if (objectModel === undefined) {
    throw new BadRequestError('Invalid Object Type');
  }

  // Sanitize data before sending it out into the world
  if (!query) {
    throw new BadRequestError('Must specify query!');
  }

  // Default to page 1
  if (query.page === undefined) {
    query.page = '1';
  }

  // Default to a query size of 10k
  if (query.size === undefined) {
    query.size = '10000';
  }

  const page = query.page ? parseInt(query.page) : -1;
  const size = query.size ? parseInt(query.size) : -1;

  if (page <= 0 || !page) {
    throw new BadRequestError('Page must be >= 1!');
  }

  if (size <= 0 || !size) {
    throw new BadRequestError('Size must be >= 1!');
  }

  const filters: any = query.filter || {};
  const and: { [k: string]: RegExp }[] = [];
  const or: { [k: string]: RegExp }[] = [];

  // Sort
  const sort: any = {};

  if (query.sortCriteria && !['asc', 'desc'].includes(query.sortCriteria)) {
    throw new BadRequestError('Invalid sort criteria! Must be asc or desc!!');
  }

  if (query.sortField && query.sortCriteria) {
    sort[query.sortField] = query.sortCriteria;
  }

  // In text search
  const text = query.text;
  if (text) {
    const regex = new RegExp(escapeStringRegexp(text), 'i'); // filters regex chars, sets to case insensitive

    const inTextSearchFields = getInTextSearchableFields(
      objectModel.rawFields,
      text,
    );

    // Apply regex against fields with in text search
    for (const f of inTextSearchFields) {
      const textQuery: any = {};

      textQuery[f] = regex;

      or.push(textQuery);
    }
  }

  if (or && or.length) {
    if ('$or' in filters) {
      filters['$or'].concat(or);
    } else {
      filters['$or'] = or;
    }
  }

  if (and && and.length) {
    if ('$and' in filters) {
      filters['$and'].concat(and);
    } else {
      filters['$and'] = and;
    }
  }

  const results = await objectModel.mongoose
    .find(filters)
    .sort(sort)
    .skip((page - 1) * size)
    .limit(size);

  const out: any[] = [];

  const total =  objectModel.mongoose.countDocuments(filters);

  const universeState = await fetchUniverseState();

  // Perform all the traversals async
  const cleanedResults = results.map((result: any) =>
    cleanObject(objectModel.rawFields, result, {
      requestUser: requestUser,
      targetObject: result,
      universeState: universeState,
    }),
  );

  for (const cleanedResult of cleanedResults) {
    // Only push it into the output if there is any data left
    if (cleanedResult && Object.keys(cleanedResult).length > 0) {
      out.push(cleanedResult);
    }
  }

  return {total, out};
};

const validateObjectEdit = (
  rawFields: any,
  changes: any,
  request: WriteCheckRequest<any, any>,
) => {
  if (!rawFields || !changes) {
    throw Error('Field or object is not truthy!');
  }

  // If the user cannot write fields at this level, we don't need to check any further
  // We also cannot write to virtual fields
  if (evaluateChecker(rawFields.writeCheck, request) && !rawFields.virtual) {
    for (const k of Object.keys(changes)) {
      const fieldMetadata = rawFields.FIELDS[k];

      if (fieldMetadata) {
        if (fieldMetadata.FIELDS !== undefined) {
          // Nested object; Recurse
          validateObjectEdit(fieldMetadata, changes[k], request);
        } else {
          // Top level field

          if (
            !evaluateChecker(fieldMetadata.writeCheck, {
              ...request,
              fieldValue: changes[k],
            }) ||
            fieldMetadata.virtual
          ) {
            // Validation failed for this field
            throw new WriteDeniedError(
              fieldMetadata,
              fieldMetadata.writeCheck,
              request,
            );
          }
        }
      } else {
        // Invalid field
        throw new WriteDeniedError(
          `Invalid field: ${k}`,
          'Update fields must be part of schema',
          request,
        );
      }
    }

    return true;
  } else {
    // Validation Failed
    throw new WriteDeniedError(changes, rawFields.writeCheck, request);
  }
};

/**
 * Flattens a multi-depth dictionary to one of depth 1, with all field names concatenated together,
 * delimited by periods.
 *
 * @param fields
 */
export const flattenFields = (fields: any, prefix = '') => {
  let out: any = {};

  for (const k of Object.keys(fields)) {
    const value = fields[k];
    const name = `${prefix}${prefix.length > 0 ? '.' : ''}${k}`;

    if (value?.constructor === Object) {
      out = {
        ...out,
        ...flattenFields(value, name),
      };
    } else {
      out[name] = value;
    }
  }

  return out;
};

/**
 * Fetch an object with mongo query
 *
 * WARNING: Only allow admins/trusted users to have unfiltered access this function. It may be possible to have
 *          arbitrary code execution if care is not taken.
 *
 * @param requestUser
 * @param objectTypeName
 * @param filter - filter map (same format as query selector for find())
 * @param changes - map of fields to update
 * @param noFlatten - when enabled, each field in changes is not flattened. WARNING! This may present a security risk
 *                                                                          as it may be possible to write to fields
 *                                                                          without going through its write check if this
 *                                                                          is enabled!
 *                     The default behaviour (when this is disabled) is to merge all fields, so only fields that are
 *                    explicitly mentioned in changes will be touched.
 * @param logEvent - whether to write this event to the system log
 */
export const editObject = async (
  requestUser: IUser,
  objectTypeName: string,
  filter: any,
  changes: any,
  noFlatten?: boolean,
  logEvent?: boolean,
) => {
  // Since this function can handle any model type, we must fetch the mongoose schema first
  const objectModel: any = (getModels() as any)[objectTypeName];

  if (objectModel === undefined) {
    throw new BadRequestError('Invalid Object type');
  }

  if (filter === undefined) {
    throw new BadRequestError('Invalid filter');
  }

  if (changes === undefined) {
    throw new BadRequestError('Invalid changes');
  }

  const amendedIDs: string[] = [];

  // Validate the proposed amendments
  const results = await objectModel.mongoose.find(filter);

  const universeState = await fetchUniverseState();

  results.map((result: any) =>
    validateObjectEdit(objectModel.rawFields, changes, {
      requestUser: requestUser,
      targetObject: result,
      submissionObject: changes,
      universeState: universeState,
      fieldValue: undefined,
    }),
  );

  // Keep track of IDs that were affected
  for (const o of Object.keys(results)) {
    amendedIDs.push(results[o]._id);

    if (logEvent) {
      log.info(
        '[OBJECT EDITED]',
        jsonify({
          requestUser: requestUser,
          filter: filter,
          objectType: objectTypeName,
          objectEdited: results[o],
          changes: changes,
        }),
      );
    }
  }

  // Flatten changes so it merges instead of replacing

  // Changes accepted and are made
  await objectModel.mongoose.updateMany(
    filter,
    noFlatten // If true, then changes will not be flattened, which MAY cause changes to OVERRITE other fields!
      ? changes
      : flattenFields(changes),
  );

  return amendedIDs;
};

const validateObjectDelete = (
  rawFields: any,
  request: DeleteCheckRequest<any>,
) => {
  if (!rawFields) {
    throw Error('Field is not truthy!');
  }

  // For delete operations, we only check the top level
  if (!evaluateChecker(rawFields.deleteCheck, request)) {
    throw new DeleteDeniedError(rawFields.deleteCheck, request);
  }

  return true;
};

/**
 * Fetch an object with mongo query
 *
 * WARNING: Only allow admins/trusted users to have unfiltered access this function. It may be possible to have
 *          arbitrary code execution if care is not taken.
 *
 * @param requestUser
 * @param objectTypeName
 * @param filter - filter map (same format as query selector for find())
 */
export const deleteObject = async (
  requestUser: IUser,
  objectTypeName: string,
  filter: any,
) => {
  // Since this function can handle any model type, we must fetch the mongoose schema first
  const objectModel: any = (getModels() as any)[objectTypeName];

  if (objectModel === undefined) {
    throw new BadRequestError('Invalid Object Type');
  }

  if (filter === undefined) {
    throw new BadRequestError('Invalid filter');
  }

  const amendedIDs: string[] = [];

  // Validate the proposed amendments
  const results = await objectModel.mongoose.find(filter);

  const universeState = await fetchUniverseState();

  results.map((result: any) =>
    validateObjectDelete(objectModel.rawFields, {
      requestUser: requestUser,
      targetObject: result,
      universeState: universeState,
    }),
  );

  // Keep track of IDs that were affected
  for (const o of Object.keys(results)) {
    amendedIDs.push(results[o]._id);

    log.info(
      '[OBJECT DELETION]',
      jsonify({
        requestUser: requestUser,
        filter: filter,
        objectType: objectTypeName,
        objectDeleted: results[o],
      }),
    );
  }

  // Changes accepted and are made
  await objectModel.mongoose.deleteMany(filter);

  return amendedIDs;
};

const validateObjectCreate = (
  rawFields: any,
  parameters: any,
  request: CreateCheckRequest<any, any>,
) => {
  if (!rawFields || !parameters) {
    throw Error('Field or object is not truthy!');
  }

  // If the user cannot create the object, we don't need to go any further
  if (evaluateChecker(rawFields.createCheck, request)) {
    // Call the edit checker to validate the fields
    validateObjectEdit(rawFields, parameters, {
      ...request,
      targetObject: {}, // The object doesn't exist yet, so we cannot rely on any validation metrics that rely on existing values
    });
  } else {
    throw new CreateDeniedError(rawFields.createCheck, request);
  }
};

/**
 * Fetch an object with mongo query
 *
 * WARNING: Only allow admins/trusted users to have unfiltered access this function. It may be possible to have
 *          arbitrary code execution if care is not taken.
 *
 * @param requestUser
 * @param objectTypeName
 * @param parameters - initial parameters to initialize the object
 */
export const createObject = async (
  requestUser: IUser,
  objectTypeName: string,
  parameters: any,
) => {
  // Since this function can handle any model type, we must fetch the mongoose schema first
  const objectModel: any = (getModels() as any)[objectTypeName];

  if (objectModel === undefined) {
    throw new BadRequestError('Invalid Object Type');
  }

  if (parameters === undefined) {
    throw new BadRequestError('Invalid parameters');
  }

  // Validate the proposed object fields
  validateObjectCreate(objectModel.rawFields, parameters, {
    requestUser: requestUser,
    universeState: await fetchUniverseState(),
    fieldValue: undefined,
    submissionObject: parameters,
  });

  const newObject = await objectModel.mongoose.create(parameters);

  return newObject._id;
};

/**
 * Iterates through all documents and ensures the settingsMapper field is populated.
 *
 * We use this field to populate the user object with data from global settings, such as deadlines.
 */
export const initializeSettingsMapper = async () => {
  const models: any = getModels();

  for (const name in models) {
    const mongooseModel = models[name].mongoose;

    console.log('Initializing', name);

    await mongooseModel.updateMany(
      {},
      {
        settingsMapper: 0,
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
        new: true,
      },
    );
  }
};
