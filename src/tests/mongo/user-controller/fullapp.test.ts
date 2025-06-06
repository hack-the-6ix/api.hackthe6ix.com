import { updateApplication } from '../../../controller/UserController';
import { enumOptions } from '../../../models/user/enums';
import { IPartialApplication, IUser } from '../../../models/user/fields';
import User from '../../../models/user/User';
import { SubmissionDeniedError, WriteDeniedError } from '../../../types/errors';
import {
  generateMockUniverseState,
  getError,
  hackerUser,
  mockDate,
  mockGetMailTemplate,
  mockSuccessResponse,
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

jest.mock('../../../services/mailer/util/external', () => {
  const external = jest.requireActual('../../../services/mailer/util/external');
  return {
    ...external,
    sendEmailRequest: jest.fn(() => mockSuccessResponse()),
    getList: jest.fn(() => mockSuccessResponse()),
    getTemplate: (templateName: string) => mockGetMailTemplate(templateName),
  };
});

jest.mock('../../../services/mailer/syncMailingList', () =>
  jest.fn((): any => undefined),
);

jest.mock('../../../services/logger', () => {
  const real = jest.requireActual('../../../services/logger');

  return {
    ...real,
    log: {
      info: jest.fn(),
    },
  };
});

/**
 * We will be using the real User schema and submitting a simulated real application
 */
describe('Update Real Application', () => {
  test('Valid update', async () => {
    const mockTS = 696969;
    const restoreDateMock = mockDate(mockTS);

    await generateMockUniverseState();

    const hackerApplication = {
      phoneNumber: '4169782011',
      age: 14,
      gender: enumOptions['gender'][0],
      ethnicity: enumOptions['ethnicity'][0],
      school: 'University of Toronto',
      program: enumOptions['programOfStudy'][0],
      levelOfStudy: enumOptions['levelOfStudy'][0],
      hackathonsAttended: enumOptions['hackathonsAttended'][0],
      creativeResponseEssay: 'X '.repeat(50),
      whyHT6Essay: 'X '.repeat(50),
      mlhCOC: true,
    } as IPartialApplication;

    const user = await User.create({
      ...hackerUser,
      status: {
        applied: false,
      },
    });

    await updateApplication(user.toJSON() as IUser, false, hackerApplication);
    restoreDateMock();

    const resultObject = await User.findOne({
      _id: hackerUser._id,
    });

    expect(resultObject.toJSON().hackerApplication).toEqual({
      ...hackerApplication,
      lastUpdated: mockTS,
    });
    expect(resultObject.status.applied).toBeFalsy();
  });

  test('Enum is falsy', async () => {
    const mockTS = 696969;
    const restoreDateMock = mockDate(mockTS);
    await generateMockUniverseState();

    const hackerApplication = {
      phoneNumber: '',
      age: 10,
      gender: '',
      ethnicity: null as unknown as string,
      school: 'University of Toronto',
      program: 'Computer Science',
      levelOfStudy: enumOptions['levelOfStudy'][0],
      graduationYear: 2030,
      hackathonsAttended: enumOptions['hackathonsAttended'][0],
      creativeResponseEssay: 'X '.repeat(50),
      whyHT6Essay: 'X '.repeat(50),
      mlhCOC: true,
    } as IPartialApplication;

    const user = await User.create({
      ...hackerUser,
      status: {
        applied: false,
      },
    });

    await updateApplication(user.toJSON() as IUser, false, hackerApplication);
    restoreDateMock();

    const resultObject = await User.findOne({
      _id: hackerUser._id,
    });

    expect(resultObject.toJSON().hackerApplication).toEqual({
      ...hackerApplication,
      lastUpdated: mockTS,
    });
    expect(resultObject.status.applied).toBeFalsy();
  });

  test('Tried to update read only field', async () => {
    await generateMockUniverseState();

    const hackerApplication = {
      phoneNumber: '4169782011',
      age: 14,
      gender: enumOptions['gender'][0],
      pronouns: enumOptions['pronouns'][0],
      ethnicity: enumOptions['ethnicity'][0],
      school: 'University of Toronto',
      program: enumOptions['programOfStudy'][0],
      levelOfStudy: enumOptions['levelOfStudy'][0],
      graduationYear: 2030,
      hackathonsAttended: enumOptions['hackathonsAttended'][0],
      creativeResponseEssay: 'X '.repeat(50),
      whyHT6Essay: 'X '.repeat(50),
      mlhCOC: true,
      teamCode: '1234',
    } as IPartialApplication;

    const user = await User.create({
      ...hackerUser,
      status: {
        applied: false,
      },
    });

    await expect(
      updateApplication(user.toJSON() as IUser, false, hackerApplication),
    ).rejects.toThrow(WriteDeniedError);

    const resultObject = await User.findOne({
      _id: hackerUser._id,
    });

    expect(resultObject.toJSON().hackerApplication).toEqual(undefined);
    expect(resultObject.status.applied).toBeFalsy();
  });

  test('Invalid update', async () => {
    await generateMockUniverseState();

    const hackerApplication = {
      gender: 'AdasdasasdasMale',
      pronouns: enumOptions['pronouns'][0],
      ethnicity: enumOptions['ethnicity'][0],
      school: 'University of Toronto',
      program: 'Computer Science',
      phoneNumber: '123123123',
      levelOfStudy: enumOptions['levelOfStudy'][0],
      graduationYear: 2030,
      hackathonsAttended: enumOptions['hackathonsAttended'][0],
      creativeResponseEssay: 'X '.repeat(50),
      whyHT6Essay: 'X '.repeat(50),
      mlhCOC: true,
    } as IPartialApplication;

    const user = await User.create({
      ...hackerUser,
      status: {
        applied: false,
      },
    });

    await expect(
      updateApplication(user.toJSON() as IUser, false, hackerApplication),
    ).rejects.toThrow(WriteDeniedError);

    const resultObject = await User.findOne({
      _id: hackerUser._id,
    });

    expect(resultObject.toJSON().hackerApplication).toEqual(undefined);
    expect(resultObject.status.applied).toBeFalsy();
  });

  test('Character limit exceeded', async () => {
    await generateMockUniverseState();

    const hackerApplication = {
      phoneNumber: '2'.repeat(50),
      age: 14,
      gender: enumOptions['gender'][0],
      ethnicity: enumOptions['ethnicity'][0],
      school: 'University of Toronto',
      program: 'Computer Science',
      graduationYear: 2030,
      levelOfStudy: enumOptions['levelOfStudy'][0],
      hackathonsAttended: enumOptions['hackathonsAttended'][0],
      creativeResponseEssay: 'X '.repeat(50),
      whyHT6Essay: 'X '.repeat(3000),
      mlhCOC: true,
    } as IPartialApplication;

    const user = await User.create({
      ...hackerUser,
      status: {
        applied: false,
      },
    });

    await expect(
      updateApplication(user.toJSON() as IUser, false, hackerApplication),
    ).rejects.toThrow(WriteDeniedError);

    const resultObject = await User.findOne({
      _id: hackerUser._id,
    });

    expect(resultObject.toJSON().hackerApplication).toEqual(undefined);
    expect(resultObject.status.applied).toBeFalsy();
  });
});

describe('Submit Real Application', () => {
  test('Enum is falsy', async () => {
    await generateMockUniverseState();

    const hackerApplication = {
      age: 17,
      school: 'University of Toronto',
      program: 'Computer Science',
      phoneNumber: '123123123',
      graduationYear: 2030,
      creativeResponseEssay: 'X '.repeat(50),
      whyHT6Essay: 'X '.repeat(50),
      mlhCOC: true,
      mlhData: true,
      shirtSize: '',
      city: 'Toronto',
      province: 'Ontario',
      country: 'Canada',
      emergencyContact: {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '1234567890',
        relationship: enumOptions['emergencyContactRelationship'][0],
      },
    } as IPartialApplication;

    const user = await User.create({
      ...hackerUser,
      status: {
        applied: false,
      },
      hackerApplication: {
        resumeFileName: 'wtf.exe',
      },
    });

    const error = await getError<SubmissionDeniedError>(() =>
      updateApplication(user.toJSON() as IUser, true, hackerApplication),
    );

    expect(error).toBeInstanceOf(SubmissionDeniedError);
    expect(error.getFields().sort()).toEqual(
      [
        '/gender',
        '/ethnicity',
        '/shirtSize',
        '/levelOfStudy',
        '/hackathonsAttended',
      ].sort(),
    );

    const resultObject = await User.findOne({
      _id: hackerUser._id,
    });

    expect(resultObject.toJSON().hackerApplication).toEqual({
      resumeFileName: 'wtf.exe',
    });
    expect(resultObject.status.applied).toBeFalsy();
  });

  test('Mandatory Fields', async () => {
    const mockTS = 696969;
    const restoreDateMock = mockDate(mockTS);

    await generateMockUniverseState();

    const hackerApplication = {
      phoneNumber: '4169782011',
      age: 18,
      gender: enumOptions['gender'][0],
      ethnicity: enumOptions['ethnicity'][0],
      school: 'University of Toronto',
      program: 'Computer Science',
      levelOfStudy: enumOptions['levelOfStudy'][0],
      graduationYear: 2030,
      hackathonsAttended: enumOptions['hackathonsAttended'][0],
      creativeResponseEssay: 'X '.repeat(50),
      whyHT6Essay: 'X '.repeat(50),
      mlhCOC: true,
      mlhData: true,
      shirtSize: enumOptions['shirt'][0],
      city: 'Toronto',
      province: 'Ontario',
      country: 'Canada',
      emergencyContact: {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '1234567890',
        relationship: enumOptions['emergencyContactRelationship'][0],
      },
    } as IPartialApplication;

    const user = await User.create({
      ...hackerUser,
      status: {
        applied: false,
      },
      hackerApplication: {
        resumeFileName: 'wtf.exe',
      },
    });

    await updateApplication(user.toJSON() as IUser, true, hackerApplication);

    restoreDateMock();

    const resultObject = await User.findOne({
      _id: hackerUser._id,
    });

    expect(resultObject.toJSON().hackerApplication).toEqual({
      ...hackerApplication,
      lastUpdated: mockTS,
      resumeFileName: 'wtf.exe',
    });
    expect(resultObject.status.applied).toBeTruthy();
  });

  test('MLH COC Denied', async () => {
    await generateMockUniverseState();

    const hackerApplication = {
      age: 15,
      phoneNumber: '1234567890',
      gender: enumOptions['gender'][0],
      ethnicity: enumOptions['ethnicity'][0],
      school: 'University of Toronto',
      program: 'Computer Science',
      levelOfStudy: enumOptions['levelOfStudy'][0],
      graduationYear: 2030,
      hackathonsAttended: enumOptions['hackathonsAttended'][0],
      creativeResponseEssay: 'X '.repeat(50),
      whyHT6Essay: 'X '.repeat(50),
      mlhCOC: false,
      mlhData: true,
      shirtSize: enumOptions['shirt'][0],
      city: 'Toronto',
      province: 'Ontario',
      country: 'Canada',
      emergencyContact: {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '1234567890',
        relationship: enumOptions['emergencyContactRelationship'][0],
      },
    } as IPartialApplication;

    const user = await User.create({
      ...hackerUser,
      status: {
        applied: false,
      },
      hackerApplication: {
        resumeFileName: 'wtf.exe',
      },
    });

    const error = await getError<SubmissionDeniedError>(() =>
      updateApplication(user.toJSON() as IUser, true, hackerApplication),
    );

    expect(error).toBeInstanceOf(SubmissionDeniedError);
    expect(error.getFields()).toEqual(['/mlhCOC']);

    const resultObject = await User.findOne({
      _id: hackerUser._id,
    });

    expect(resultObject.toJSON().hackerApplication).toEqual({
      resumeFileName: 'wtf.exe',
    });
    expect(resultObject.status.applied).toBeFalsy();
  });

  test('MLH Data Denied', async () => {
    await generateMockUniverseState();

    const hackerApplication = {
      phoneNumber: '4169782011',
      age: 18,
      gender: enumOptions['gender'][0],
      ethnicity: enumOptions['ethnicity'][0],
      school: 'University of Toronto',
      program: 'Computer Science',
      levelOfStudy: enumOptions['levelOfStudy'][0],
      graduationYear: 2030,
      hackathonsAttended: enumOptions['hackathonsAttended'][0],
      creativeResponseEssay: 'X '.repeat(50),
      whyHT6Essay: 'X '.repeat(50),
      mlhCOC: true,
      mlhData: false,
      shirtSize: enumOptions['shirt'][0],
      city: 'Toronto',
      province: 'Ontario',
      country: 'Canada',
      emergencyContact: {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '1234567890',
        relationship: enumOptions['emergencyContactRelationship'][0],
      },
    } as IPartialApplication;

    const user = await User.create({
      ...hackerUser,
      status: {
        applied: false,
      },
      hackerApplication: {
        resumeFileName: 'wtf.exe',
      },
    });

    const error = await getError<SubmissionDeniedError>(() =>
      updateApplication(user.toJSON() as IUser, true, hackerApplication),
    );

    expect(error).toBeInstanceOf(SubmissionDeniedError);
    expect(error.getFields()).toEqual(['/mlhData']);

    const resultObject = await User.findOne({
      _id: hackerUser._id,
    });

    expect(resultObject.toJSON().hackerApplication).toEqual({
      resumeFileName: 'wtf.exe',
    });
    expect(resultObject.status.applied).toBeFalsy();
  });

  test('Missing Resume', async () => {
    await generateMockUniverseState();

    const hackerApplication = {
      phoneNumber: '4169782011',
      age: 18,
      gender: enumOptions['gender'][0],
      ethnicity: enumOptions['ethnicity'][0],
      school: 'University of Toronto',
      program: 'Computer Science',
      levelOfStudy: enumOptions['levelOfStudy'][0],
      graduationYear: 2030,
      hackathonsAttended: enumOptions['hackathonsAttended'][0],
      creativeResponseEssay: 'X '.repeat(50),
      whyHT6Essay: 'X '.repeat(50),
      mlhCOC: true,
      mlhData: true,
      shirtSize: enumOptions['shirt'][0],
      city: 'Toronto',
      province: 'Ontario',
      country: 'Canada',
      emergencyContact: {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '1234567890',
        relationship: enumOptions['emergencyContactRelationship'][0],
      },
    } as IPartialApplication;

    const user = await User.create({
      ...hackerUser,
      status: {
        applied: false,
      },
    });

    const error = await getError<SubmissionDeniedError>(() =>
      updateApplication(user.toJSON() as IUser, true, hackerApplication),
    );

    expect(error).toBeInstanceOf(SubmissionDeniedError);
    expect(error.getFields().sort()).toEqual(
      ['/resumeFileName', '/friendlyResumeFileName'].sort(),
    );

    const resultObject = await User.findOne({
      _id: hackerUser._id,
    });

    expect(resultObject.toJSON().hackerApplication).toEqual(undefined);
    expect(resultObject.status.applied).toBeFalsy();
  });
});
