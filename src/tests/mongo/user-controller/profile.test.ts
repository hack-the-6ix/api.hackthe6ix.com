import { fetchUser } from '../../../controller/UserController';
import { getModels } from '../../../controller/util/resources';
import { IUser } from '../../../models/user/fields';
import { isOrganizer, isUserOrOrganizer, maxLength } from '../../../models/validator';
import { ReadCheckRequest, WriteCheckRequest } from '../../../types/checker';
import { NotFoundError } from '../../../types/errors';
import {
  adminUser,
  generateTestModel,
  hackerUser,
  organizerUser,
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

const [userTestModel, mockModels] = generateTestModel({
  writeCheck: (request: WriteCheckRequest<any, IUser>) => isUserOrOrganizer(request.requestUser, request.targetObject),
  readCheck: (request: ReadCheckRequest<IUser>) => isUserOrOrganizer(request.requestUser, request.targetObject),

  FIELDS: {
    firstName: {
      type: String,
      readCheck: true,
      writeCheck: (request: WriteCheckRequest<string, IUser>) => isOrganizer(request.requestUser) && maxLength(64)(request),
    },
    lastName: {
      type: String,
      readCheck: true,
      writeCheck: (request: WriteCheckRequest<string, IUser>) => isOrganizer(request.requestUser) && maxLength(64)(request),
    },
    email: {
      type: String,
      readCheck: true,
      writeCheck: (request: WriteCheckRequest<string, IUser>) => isOrganizer(request.requestUser) && maxLength(64)(request),
    },
    internal: {
      readCheck: (request: ReadCheckRequest<IUser>) => isOrganizer(request.requestUser),
      writeCheck: (request: ReadCheckRequest<IUser>) => isOrganizer(request.requestUser),

      FIELDS: {
        secretNode: {
          type: String,
          readCheck: true,
          writeCheck: true,
        },
      },
    },
    application: {
      readCheck: true,
      writeCheck: true,

      FIELDS: {
        applicationField: {
          type: String,
          readCheck: true,
          writeCheck: true,
        },
      },
    },
  },
}, 'user');

getModels.mockReturnValue(mockModels);

describe('Get profile', () => {
  test('Success', async () => {
    await userTestModel.create(adminUser);
    await userTestModel.create(hackerUser);
    await userTestModel.create(organizerUser);

    expect((await userTestModel.find({})).length).toEqual(3);

    const data = await fetchUser(hackerUser);

    // Expect to get the correct user object
    expect(data).toEqual({
      firstName: hackerUser.firstName,
      lastName: hackerUser.lastName,
      email: hackerUser.email,
      application: {
        applicationField: undefined,
      },
    });
  });

  test('Fail', async () => {
    await expect(fetchUser({} as IUser)).rejects.toThrow(NotFoundError);
  });
});
