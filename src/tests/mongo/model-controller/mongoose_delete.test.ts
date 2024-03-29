import { deleteObject } from '../../../controller/ModelController';
import { getModels } from '../../../controller/util/resources';
import { log } from '../../../services/logger';
import { DeleteDeniedError } from '../../../types/errors';
import {
  generateTestModel,
  hackerUser,
  runAfterAll,
  runAfterEach,
  runBeforeAll,
  runBeforeEach,
} from '../../test-utils';

/**
 * Connect to a new in-memory database before running any tests.
 */
beforeAll(runBeforeAll);

/**
 * Clear all test data after every test.
 */
afterEach(runAfterEach);

beforeEach(runBeforeEach);

/**
 * Remove and close the db and server.
 */
afterAll(runAfterAll);

jest.mock('../../../controller/util/resources', () => (
  {
    ...jest.requireActual('../../../controller/util/resources'),
    getModels: jest.fn(),
  }
));

jest.mock('../../../services/logger', () => {
  const real = jest.requireActual('../../../services/logger');

  return {
    ...real,
    log: {
      info: jest.fn(),
    },
  };
});

describe('Model Delete', () => {

  test('Does it actually delete?', async () => {
    const [successDeleteTestModel, mockModels] = generateTestModel({
      deleteCheck: true,
      FIELDS: {
        field1: {
          type: String,
        },
      },
    }, 'DeleteTest');

    getModels.mockReturnValue(mockModels);

    // Create some objects to fill the DB
    await successDeleteTestModel.create({ field1: 'Banana' });
    const fail1 = await successDeleteTestModel.create({});
    const fail2 = await successDeleteTestModel.create({});
    const resultObject1 = await successDeleteTestModel.find({});
    expect(resultObject1.length).toEqual(3);

    const data = await deleteObject(
      hackerUser,
      'DeleteTest',
      {
        field1: {
          $ne: 'Banana', // We should only be deleting non-bananas
        },
      });

    // Non-bananas deleted
    const resultObject2 = await successDeleteTestModel.find({});
    expect(resultObject2.length).toEqual(1);

    // Verify deleted IDs are returned
    expect(data).toContainEqual(fail1._id);
    expect(data).toContainEqual(fail2._id);
    expect(data.length).toEqual(2);
  });

  test('Logger', async () => {
    const [successDeleteTestModel, mockModels] = generateTestModel({
      deleteCheck: true,
      FIELDS: {
        foo: {
          type: Boolean,
        },
      },
    }, 'LoggerDeleteTest');

    getModels.mockReturnValue(mockModels);

    // Create some objects to fill the DB
    const originalObject = await successDeleteTestModel.create({
      foo: true,
    });
    const originalObject2 = await successDeleteTestModel.create({
      foo: true,
    });
    const originalObject3 = await successDeleteTestModel.create({
      foo: false,
    });
    const resultObject1 = await successDeleteTestModel.find({});
    expect(resultObject1.length).toEqual(3);

    const data = await deleteObject(
      hackerUser,
      'LoggerDeleteTest',
      {
        foo: true,
      },
    );

    // Object deleted
    const resultObject2 = await successDeleteTestModel.find({});
    expect(resultObject2.length).toEqual(1);

    // Verify deleted IDs are returned
    expect(data.sort()).toEqual([originalObject._id, originalObject2._id].sort());
    expect(log.info).toHaveBeenCalledTimes(2);
  });

  describe('Delete Check', () => {
    test('Success', async () => {
      const [successDeleteTestModel, mockModels] = generateTestModel({
        deleteCheck: true,
        FIELDS: {},
      }, 'SuccessDeleteTest');

      getModels.mockReturnValue(mockModels);

      // Create some objects to fill the DB
      const originalObject = await successDeleteTestModel.create({});
      const resultObject1 = await successDeleteTestModel.find({});
      expect(resultObject1.length).toEqual(1);

      const data = await deleteObject(
        hackerUser,
        'SuccessDeleteTest',
        {},
      );

      // Object deleted
      const resultObject2 = await successDeleteTestModel.find({});
      expect(resultObject2.length).toEqual(0);

      // Verify deleted IDs are returned
      expect(data).toContainEqual(originalObject._id);
      expect(data.length).toEqual(1);
    });

    test('Fail', async () => {
      const [successDeleteTestModel, mockModels] = generateTestModel({
        deleteCheck: false,
        FIELDS: {},
      }, 'FailDeleteTest');

      getModels.mockReturnValue(mockModels);

      // Create some objects to fill the DB
      await successDeleteTestModel.create({});
      const resultObject1 = await successDeleteTestModel.find({});
      expect(resultObject1.length).toEqual(1);

      await expect(deleteObject(
        hackerUser,
        'FailDeleteTest',
        {},
      )).rejects.toThrow(DeleteDeniedError);

      // Database is still intact
      const resultObject2 = await successDeleteTestModel.find({});
      expect(resultObject2.length).toEqual(1);
    });
  });
});

