import { updateApplication } from '../../../controller/UserController';
import User from '../../../models/user/User';
import syncUserMailingLists from '../../../services/mailer/syncUserMailingLists';
import { sendEmailRequest } from '../../../services/mailer/util/listmonk';
import { WriteCheckRequest } from '../../../types/checker';
import {
  AlreadySubmittedError,
  BadRequestError,
  DeadlineExpiredError,
  ForbiddenError,
  SubmissionDeniedError,
  WriteDeniedError,
} from '../../../types/errors';
import { MailTemplate } from '../../../types/mailer';
import {
  generateMockUniverseState, getError,
  hackerUser,
  mockGetMailTemplate,
  mockSuccessResponse,
  runAfterAll,
  runAfterEach,
  runBeforeAll,
  runBeforeEach,
} from '../../test-utils';
import {IUser} from "../../../models/user/fields";

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

jest.mock('../../../services/mailer/util/listmonk', () => {
  const listmonk = jest.requireActual('../../../services/mailer/util/listmonk');
  return {
    ...listmonk,
    sendEmailRequest: jest.fn(() => mockSuccessResponse()),
  };
});

jest.mock('../../../services/mailer/syncUserMailingLists', () => jest.fn((): any => undefined));

jest.mock('../../../services/mailer/util/db', () => ({
  getList: jest.fn(() => mockSuccessResponse()),
  getTemplate: jest.fn().mockImplementation(async (templateName: string) => mockGetMailTemplate(templateName)),
}));

jest.mock('../../../services/logger', () => {
  const real = jest.requireActual('../../../services/logger');

  return {
    ...real,
    log: {
      info: jest.fn(),
    },
  };
});

jest.mock('../../../models/user/fields', () => {
  const actualFields = jest.requireActual('../../../models/user/fields');
  const deepcopy = jest.requireActual('deepcopy');

  const updatedFields = deepcopy(actualFields.fields);
  updatedFields.FIELDS.hackerApplication = {
    readCheck: true,
    writeCheck: true,

    FIELDS: {
      submitCheckFallback: { // this should pass because submitCheck > writeCheck
        type: String,
        writeCheck: false,
        submitCheck: true,
      },
      optionalField: {
        type: String,
        readCheck: true,
        writeCheck: true,
        submitCheck: true,
        caption: 'Optional Field',
      },
      optionalField2: {
        type: String,
        readCheck: true,
        writeCheck: true,
        submitCheck: true,
        caption: 'Optional Field 2',
      },
      requiredFieldImplicit: {
        type: String,
        readCheck: true,
        writeCheck: (request: WriteCheckRequest<string, any>) => request.fieldValue === 'foobar',
        caption: 'Required Field',
      },
      requiredFieldExplicit: {
        type: String,
        readCheck: true,
        writeCheck: (request: WriteCheckRequest<string, any>) => !request.fieldValue || request.fieldValue.length < 100,
        submitCheck: (request: WriteCheckRequest<string, any>) => request.fieldValue === 'foobar',
        caption: 'Required Field 2',
      },
      conditionalField: {
        type: String,
        readCheck: true,
        writeCheck: (request: WriteCheckRequest<string, any>) => !request.fieldValue || request.fieldValue.length < 10,
        caption: 'Conditional Field',
      },
    },
  };

  return {
    ...actualFields,
    fields: updatedFields,
  };
});

describe('Update Application', () => {
  describe('Success', () => {
    test('Verify mailing list not synced', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          applied: false,
        },
      });

      await updateApplication(
        user.toJSON(),
        false,
        {
          optionalField2: 'Test',
        } as any,
      );

      expect(syncUserMailingLists).not.toHaveBeenCalled();
    });

    test('Verify no email sent', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          applied: false,
        },
      });

      await updateApplication(
        user.toJSON(),
        false,
        {
          optionalField2: 'Test',
        } as any,
      );

      expect(sendEmailRequest).not.toHaveBeenCalled();
    });

    test('Normal Deadline', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          applied: false,
        },
      });

      await updateApplication(
        user.toJSON(),
        false,
        {
          optionalField2: 'Test',
        } as any,
      );

      const resultObject = await User.findOne({
        _id: hackerUser._id,
      });

      expect(resultObject.toJSON().hackerApplication).toEqual({
        optionalField2: 'Test',
      });
    });

    test('Personal Deadline', async () => {
      await generateMockUniverseState({
        applyOffset: -10000
      });

      const user = await User.create({
        ...hackerUser,
        status: {
          applied: false,
        },
        personalApplicationDeadline: new Date().getTime() + 10000,
      });

      await updateApplication(
        user.toJSON(),
        false,
        {
          optionalField2: 'Test',
        } as any,
      );

      const resultObject = await User.findOne({
        _id: hackerUser._id,
      });

      expect(resultObject.toJSON().hackerApplication).toEqual({
        optionalField2: 'Test',
      });
    });


    test('Missing Required Field', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          applied: false,
        },
      });

      await updateApplication(
        user.toJSON(),
        false,
        {
          optionalField2: 'Test',
        } as any,
      );

      const resultObject = await User.findOne({
        _id: hackerUser._id,
      });

      expect(resultObject.toJSON().hackerApplication).toEqual({
        optionalField2: 'Test',
      });
    });

    test('Merge', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          applied: false,
        },
        hackerApplication: {
          optionalField: 'foobar',
        },
      });

      await updateApplication(
        user.toJSON(),
        false,
        {
          optionalField2: 'Test',
        } as any,
      );

      const resultObject = await User.findOne({
        _id: hackerUser._id,
      });

      expect(resultObject.toJSON().hackerApplication).toEqual({
        optionalField2: 'Test',
        optionalField: 'foobar',
      });
    });
  });

  describe('Fail', () => {

    test('Bad Application', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          applied: false,
        },
      });

      await expect(updateApplication(
        user.toJSON(),
        false,
        undefined,
      )).rejects.toThrow(BadRequestError);

      const resultObject = await User.findOne({
        _id: hackerUser._id,
      });

      expect(resultObject.toJSON().hackerApplication).toEqual(undefined);
    });

    test('Write violation', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          applied: false,
        },
      });

      await expect(updateApplication(
        user.toJSON(),
        false,
        {
          conditionalField: 'XXXXXXXXXXXXXXXXXXXXXXXX',
        } as any,
      )).rejects.toThrow(WriteDeniedError);

      const resultObject = await User.findOne({
        _id: hackerUser._id,
      });

      expect(resultObject.toJSON().hackerApplication).toEqual(undefined);
    });

    test('Already submitted', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          applied: true,
        },
      });

      await expect(updateApplication(
        user.toJSON(),
        false,
        {
          optionalField2: 'Test',
        } as any,
      )).rejects.toThrow(ForbiddenError);

      const resultObject = await User.findOne({
        _id: hackerUser._id,
      });

      expect(resultObject.toJSON().hackerApplication).toEqual(undefined);
    });

    describe('Deadline passed', () => {
      test('Global Deadline passed', async () => {
        await generateMockUniverseState({
          applyOffset: -10000
        });

        const user = await User.create({
          ...hackerUser,
          status: {
            applied: false,
          },
        });

        await expect(updateApplication(
          user.toJSON(),
          false,
          {
            optionalField2: 'Test',
          } as any,
        )).rejects.toThrow(DeadlineExpiredError);

        const resultObject = await User.findOne({
          _id: hackerUser._id,
        });

        expect(resultObject.toJSON().hackerApplication).toEqual(undefined);
      });

      test('Personal Deadline passed', async () => {
        await generateMockUniverseState({
          applyOffset: -10000
        });

        const user = await User.create({
          ...hackerUser,
          status: {
            applied: false,
          },
          personalApplicationDeadline: new Date().getTime() - 1000,
        });

        await expect(updateApplication(
          user.toJSON(),
          false,
          {
            optionalField2: 'Test',
          } as any,
        )).rejects.toThrow(DeadlineExpiredError);

        const resultObject = await User.findOne({
          _id: hackerUser._id,
        });

        expect(resultObject.toJSON().hackerApplication).toEqual(undefined);
      });
    });
  });
});

describe('Submit Application', () => {
  describe('Success', () => {
    test('Verify email sent', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          applied: false,
        },
        mailingListSubcriberID: 1,
      });

      await updateApplication(
        user.toJSON(),
        true,
        {
          optionalField2: 'Test',
          requiredFieldImplicit: 'foobar',
          requiredFieldExplicit: 'foobar',
        } as any,
      );

      expect(sendEmailRequest).toHaveBeenCalledWith(
        user.mailingListSubcriberID, mockGetMailTemplate(MailTemplate.applied).templateID, undefined,
      );

      expect(syncUserMailingLists).toHaveBeenCalled();
    });

    test('Normal Deadline', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          applied: false,
        },
      });

      await updateApplication(
        user.toJSON(),
        true,
        {
          optionalField2: 'Test',
          requiredFieldImplicit: 'foobar',
          requiredFieldExplicit: 'foobar',
        } as any,
      );

      const resultObject = await User.findOne({
        _id: hackerUser._id,
      });

      expect(resultObject.toJSON().hackerApplication).toEqual({
        optionalField2: 'Test',
        requiredFieldImplicit: 'foobar',
        requiredFieldExplicit: 'foobar',
      });

      expect(resultObject.status.applied).toBeTruthy();
    });

    test('Personal Deadline', async () => {
      await generateMockUniverseState({
        applyOffset: -10000
      });

      const user = await User.create({
        ...hackerUser,
        status: {
          applied: false,
        },
        personalApplicationDeadline: new Date().getTime() + 10000,
      });

      await updateApplication(
        user.toJSON(),
        true,
        {
          optionalField2: 'Test',
          requiredFieldImplicit: 'foobar',
          requiredFieldExplicit: 'foobar',
        } as any,
      );

      const resultObject = await User.findOne({
        _id: hackerUser._id,
      });

      expect(resultObject.toJSON().hackerApplication).toEqual({
        optionalField2: 'Test',
        requiredFieldImplicit: 'foobar',
        requiredFieldExplicit: 'foobar',
      });

      expect(resultObject.status.applied).toBeTruthy();
    });
  });

  describe('Fail', () => {
    describe('Submit condition', () => {
      test('Implicit submitCheck', async () => {
        await generateMockUniverseState();

        const user = await User.create({
          ...hackerUser,
          status: {
            applied: false,
          },
        });

        // @ts-ignore
        const error = await getError<SubmissionDeniedError>(() => updateApplication(
            user.toJSON() as IUser,
            true,
            {
              requiredFieldImplicit: 'this is not a foobar',
              requiredFieldExplicit: 'foobar',
            } as any,
        ));

        expect(error).toBeInstanceOf(SubmissionDeniedError);
        expect(error.getFields()).toEqual(["/requiredFieldImplicit"]);

        const resultObject = await User.findOne({
          _id: hackerUser._id,
        });

        expect(resultObject.toJSON().hackerApplication).toEqual(undefined);
        expect(resultObject.toJSON().status.applied).toBeFalsy();

      });

      test('Explicit submitCheck', async () => {
        await generateMockUniverseState();

        const user = await User.create({
          ...hackerUser,
          status: {
            applied: false,
          },
        });

        const error = await getError<SubmissionDeniedError>(() => updateApplication(
            user.toJSON() as IUser,
            true,
            {
              requiredFieldImplicit: 'foobar',
              requiredFieldExplicit: 'this is not a foobar',
            } as any,
        ));

        expect(error).toBeInstanceOf(SubmissionDeniedError);
        expect(error.getFields()).toEqual(["/requiredFieldExplicit"]);

        const resultObject = await User.findOne({
          _id: hackerUser._id,
        });

        expect(resultObject.toJSON().hackerApplication).toEqual(undefined);
        expect(resultObject.toJSON().status.applied).toBeFalsy();
      });

    });

    test('Write violation', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          applied: false,
        },
      });

      const error = await getError<SubmissionDeniedError>(() => updateApplication(
          user.toJSON() as IUser,
          true,
          {
            requiredFieldImplicit: 'foobar',
            requiredFieldExplicit: 'foobar',
            conditionalField: 'XXXXXXXXXXXXXXXXXXXXXXXX',
          } as any,
      ));

      expect(error).toBeInstanceOf(SubmissionDeniedError);
      expect(error.getFields()).toEqual(["/conditionalField"]);

      const resultObject = await User.findOne({
        _id: hackerUser._id,
      });

      expect(resultObject.toJSON().hackerApplication).toEqual(undefined);
      expect(resultObject.toJSON().status.applied).toBeFalsy();
    });

    test('Already submitted', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          applied: true,
        },
      });

      await expect(updateApplication(
        user.toJSON(),
        true,
        {
          requiredFieldImplicit: 'foobar',
          requiredFieldExplicit: 'foobar',
        } as any,
      )).rejects.toThrow(AlreadySubmittedError);

      const resultObject = await User.findOne({
        _id: hackerUser._id,
      });

      expect(resultObject.toJSON().hackerApplication).toEqual(undefined);
    });

    describe('Deadline passed', () => {
      test('Global Deadline passed', async () => {
        await generateMockUniverseState({
          applyOffset: -10000
        });

        const user = await User.create({
          ...hackerUser,
          status: {
            applied: false,
          },
        });

        await expect(updateApplication(
          user.toJSON(),
          true,
          {
            requiredFieldImplicit: 'foobar',
            requiredFieldExplicit: 'foobar',
          } as any,
        )).rejects.toThrow(DeadlineExpiredError);

        const resultObject = await User.findOne({
          _id: hackerUser._id,
        });

        expect(resultObject.toJSON().hackerApplication).toEqual(undefined);
      });

      test('Personal Deadline passed', async () => {
        await generateMockUniverseState({
          applyOffset: -10000
        });

        const user = await User.create({
          ...hackerUser,
          status: {
            applied: false,
          },
          personalApplicationDeadline: new Date().getTime() - 1000,
        });

        await expect(updateApplication(
          user.toJSON(),
          true,
          {
            requiredFieldImplicit: 'foobar',
            requiredFieldExplicit: 'foobar',
          } as any,
        )).rejects.toThrow(DeadlineExpiredError);

        const resultObject = await User.findOne({
          _id: hackerUser._id,
        });

        expect(resultObject.toJSON().hackerApplication).toEqual(undefined);
        expect(resultObject.toJSON().status.applied).toBeFalsy();
      });
    });
  });
});

/**
 * TODO: Test resume upload API
 *       Update: There are issues with the MongoMemoryServer and GridFS, so this might not be possible atm
 */
