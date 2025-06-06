import { ObjectId } from 'bson';
import mongoose from 'mongoose';
import Settings from '../models/settings/Settings';
import { IUser } from '../models/user/fields';
import { extractFields } from '../models/util';
import * as dbHandler from './db-handler';
import * as MockDate from "mockdate";
import {NoErrorThrownError} from "../types/errors";
import {MailTemplate} from "../types/mailer";

export const adminUser = {
  _id: new ObjectId('5f081f878c60690dd9b9fd50'),
  firstName: 'Admin',
  lastName: 'Last Admin',
  idpLinkID: 'admin',
  email: 'admin@test.ca',
  groups: {
    admin: true,
    organizer: true,
    volunteer: true,
    hacker: true,
  },
  roles: {
    admin: true,
    organizer: true,
    volunteer: true,
    hacker: true,
  },
} as IUser;

export const organizerUser = {
  _id: new ObjectId('5f081f878c60690dd9b9fd59'),
  firstName: 'Organizer',
  lastName: 'Last Organizer',
  idpLinkID: 'organizer',
  email: 'organizer@test.ca',
  groups: {
    organizer: true,
  },
  roles: {
    organizer: true,
    volunteer: true,
  },
} as IUser;

export const voluteerUser = {
  _id: new ObjectId('5f081f878c60690dd9b9fd58'),
  firstName: 'Volunteer',
  lastName: 'Last Volunteer',
  idpLinkID: 'volunteer',
  email: 'volunteer@test.ca',
  groups: {
    volunteer: true,
  },
  roles: {
    volunteer: true,
  },
} as IUser;

export const hackerUser = {
  _id: new ObjectId('5f081f878c60690dd9b9fd57'),
  firstName: 'Hacker',
  lastName: 'Last Hacker',
  idpLinkID: 'hacker',
  email: 'hacker@test.ca',
  groups: {
    hacker: true,
  },
  roles: {
    hacker: true,
  },
  internal: {
    notes: 'This is a bad person',
  },
} as IUser;

export const confirmedHackerUser = {
  _id: new ObjectId('610590f06b11d739a107c636'),
  firstName: 'Confirmed',
  lastName: 'Last Hacker',
  idpLinkID: 'hackerconfirmed',
  email: 'hackerconfirmed@test.ca',
  status: {
    confirmed: true,
  },
  groups: {
    hacker: true,
  },
  roles: {
    hacker: true,
  },
  internal: {
    notes: 'This is a confirmed bad person',
  },
} as IUser;

export const externalUser = {
  _id: new ObjectId('61058ea2185c1e4282509faa'),
  firstName: 'External',
  lastName: 'Last External',
  email: 'external@test.ca',
};

export const nopermUser = {
  _id: new ObjectId('5f081f878c60690dd9b9fd17'),
  firstName: 'Noperm',
  lastName: 'Last Noperm',
  idpLinkID: 'noperm',
  email: 'ihavenoperms@test.ca',
  groups: {},
} as IUser;

/**
 * Generate test model using fields from `testFields` and the name `name`
 *
 * @param testFields
 * @param name
 * @return Test mongoose model
 */
export const generateTestModel = (testFields: any, name: string) => {
  const testSchema = new mongoose.Schema(extractFields(testFields), {
    toObject: {
      virtuals: true,
    },
    toJSON: {
      virtuals: true,
    },
  });

  const Test = mongoose.model(name, testSchema);

  const models: any = {};

  (models as any)[name] = {
    mongoose: Test,
    rawFields: testFields,
  };

  return [Test, models];
};

export const generateMockUniverseState = async ({openOffset = -100000, applyOffset = 100000, confirmOffset = 200000, waitlistAcceptedConfirmationOffset = 300000, maxAccept = 100, maxWaitlist = 100} = {}) => {
  return await Settings.findOneAndUpdate({},
    {
      universe: {
        public: {
          globalApplicationOpen: new Date().getTime() + openOffset,
          globalApplicationDeadline: new Date().getTime() + applyOffset,
          globalConfirmationDeadline: new Date().getTime() + confirmOffset,
          globalWaitlistAcceptedConfirmationDeadline: new Date().getTime() + waitlistAcceptedConfirmationOffset,
        },
        private: {
          maxAccepted: maxAccept,
          maxWaitlist: maxWaitlist,
        },
      },
    }, {
      upsert: true,
      setDefaultsOnInsert: true,
      new: true,
    });
};

export const mockDate = (timestamp: number) => {
  // const mockDate = new Date(timestamp);
  // // @ts-ignore
  // const spy = jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
  // console.debug("HELLO")
  MockDate.set(new Date(timestamp))

  return () => MockDate.reset()
};

export const mockGetMailTemplate = (templateName: string) => {
  let id;
  switch (templateName) {
    case MailTemplate.applied:
      id = 1;
      break;
    case MailTemplate.confirmed:
      id = 2;
      break;
    case MailTemplate.declined:
      id = 3;
      break;
    default:
      id = 99;
  }
  return {
    subject: `subject${templateName}`,
    templateID: id,
  };
};

export const mockSuccessResponse = () => ({ status: 200, data: {} as any });
export const mockErrorResponse = () => ({ status: 500, data: {} as any });

export interface SystemTestContext {
  mongoose: typeof mongoose
}

export const runBeforeAllAndInject = (context: SystemTestContext): () => Promise<void> => {
  return async () => {
    context.mongoose = await dbHandler.connect();
  }
}

export const runBeforeAll = async () => {
  await (runBeforeAllAndInject({} as SystemTestContext))();
};

export const runAfterEach = async () => {
  await dbHandler.clearDatabase();
  // @ts-ignore
  jest.clearAllMocks();
};

export const runBeforeEach = async () => {
  await generateMockUniverseState();
};

export const runAfterAll = async () => await dbHandler.closeDatabase();

/*
 * Return error from call
 * Source: https://github.com/jest-community/eslint-plugin-jest/blob/main/docs/rules/no-conditional-expect.md#how-to-catch-a-thrown-error-for-testing-without-violating-this-rule
 */
export const getError = async <TError>(call: () => unknown): Promise<TError> => {
  try {
    await call();

    throw new NoErrorThrownError();
  } catch (error: unknown) {
    return error as TError;
  }
};

