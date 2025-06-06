import { rsvp } from '../../../controller/UserController';
import User from '../../../models/user/User';
import { sendEmailRequest } from '../../../services/mailer/util/listmonk';
import { DeadlineExpiredError, RSVPRejectedError } from '../../../types/errors';
import { MailTemplate } from '../../../types/mailer';
import {
  generateMockUniverseState,
  hackerUser,
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


jest.mock('../../../services/mailer/util/listmonk', () => {
  const listmonk = jest.requireActual('../../../services/mailer/util/listmonk');
  return {
    ...listmonk,
    sendEmailRequest: jest.fn(() => mockSuccessResponse()),
  };
});

jest.mock('../../../services/mailer/util/db', () => ({
  getList: jest.fn(() => mockSuccessResponse()),
  getTemplate: jest.fn().mockImplementation(async (templateName: string) => mockGetMailTemplate(templateName)),
}));

jest.mock('../../../services/mailer/syncMailingList', () => jest.fn((): any => undefined));
jest.mock('../../../services/mailer/syncUserMailingLists', () => jest.fn((): any => undefined));

describe('RSVP', () => {
  describe('Deadlines', () => {
    describe('Global Deadline', () => {
      test('Success', async () => {
        await generateMockUniverseState();

        const user = await User.create({
          ...hackerUser,
          status: {
            accepted: true,
            statusReleased: true,
          },
        });

        await rsvp(
          user,
          {
            attending: true,
            form: {}
          },
        );

        const resultObject = await User.findOne({
          _id: user._id,
        });

        expect(resultObject.toJSON().status.confirmed).toEqual(true);
        expect(resultObject.toJSON().status.declined).toEqual(false);
      });

      test('Fail', async () => {
        await generateMockUniverseState({
          confirmOffset: -10000
        });

        const user = await User.create({
          ...hackerUser,
          status: {
            accepted: true,
            statusReleased: true,
          },
        });

        await expect(rsvp(
          user,
          {
            attending: true,
            form: {}
          },
        )).rejects.toThrow(DeadlineExpiredError);

        const resultObject = await User.findOne({
          _id: user._id,
        });

        expect(resultObject.toJSON().status.confirmed).toEqual(false);
        expect(resultObject.toJSON().status.declined).toEqual(false);
      });
    });

    describe('Personal Deadline', () => {
      test('Success', async () => {
        await generateMockUniverseState({
          confirmOffset: -10000
        });

        const user = await User.create({
          ...hackerUser,
          status: {
            accepted: true,
            statusReleased: true,
          },
          personalRSVPDeadline: new Date().getTime() + 10000,
        });

        await rsvp(
          user,
          {
            attending: true,
            form: {}
          },
        );

        const resultObject = await User.findOne({
          _id: user._id,
        });

        expect(resultObject.toJSON().status.confirmed).toEqual(true);
        expect(resultObject.toJSON().status.declined).toEqual(false);
      });

      test('Fail', async () => {
        await generateMockUniverseState({
          confirmOffset: -10000
        });

        const user = await User.create({
          ...hackerUser,
          status: {
            accepted: true,
            statusReleased: true,
          },
          personalRSVPDeadline: new Date().getTime() - 10000,
        });

        await expect(rsvp(
          user,
          {
            attending: true,
            form: {}
          },
        )).rejects.toThrow(DeadlineExpiredError);

        const resultObject = await User.findOne({
          _id: user._id,
        });

        expect(resultObject.toJSON().status.confirmed).toEqual(false);
        expect(resultObject.toJSON().status.declined).toEqual(false);
      });
    });
  });

  describe('Not eligible', () => {
    test('Not accepted', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          accepted: false,
          statusReleased: true,
        },
      });

      expect(rsvp(
        user,
        {
          attending: true,
          form: {}
        },
      )).rejects.toThrow(RSVPRejectedError);

      const resultObject = await User.findOne({
        _id: user._id,
      });

      expect(resultObject.toJSON().status.confirmed).toEqual(false);
      expect(resultObject.toJSON().status.declined).toEqual(false);
    });

    test('Already declined', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          accepted: true,
          declined: true,
          statusReleased: true,
        },
      });

      expect(rsvp(
        user,
        {
          attending: true,
          form: {}
        },
      )).rejects.toThrow(RSVPRejectedError);

      const resultObject = await User.findOne({
        _id: user._id,
      });

      expect(resultObject.toJSON().status.confirmed).toEqual(false);
      expect(resultObject.toJSON().status.declined).toEqual(true);
    });

    test('Status not released', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          accepted: true,
          statusReleased: false,
        },
      });

      expect(rsvp(
        user,
        {
          attending: true,
          form: {}
        },
      )).rejects.toThrow(RSVPRejectedError);

      const resultObject = await User.findOne({
        _id: user._id,
      });

      expect(resultObject.toJSON().status.confirmed).toEqual(false);
    });
  });

  describe('Confirmation State', () => {
    test('Confirm', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          accepted: true,
          statusReleased: true,
        },
        mailingListSubcriberID: 1,
      });

      await rsvp(
        user,
        {
          attending: true,
          form: {}
        },
      );

      const resultObject = await User.findOne({
        _id: user._id,
      });

      expect(resultObject.toJSON().status.confirmed).toEqual(true);
      expect(resultObject.toJSON().status.declined).toEqual(false);

      // Verify confirmation email sent
      expect(sendEmailRequest).toHaveBeenCalledWith(
        1, mockGetMailTemplate(MailTemplate.confirmed).templateID, undefined
      );
    });

    test('Decline', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          accepted: true,
          statusReleased: true,
        },
        mailingListSubcriberID: 1,
      });

      await rsvp(
        user,
        {
          attending: false,
          form: {}
        },
      );

      const resultObject = await User.findOne({
        _id: user._id,
      });

      expect(resultObject.toJSON().status.confirmed).toEqual(false);
      expect(resultObject.toJSON().status.declined).toEqual(true);

      // Verify confirmation email sent
      expect(sendEmailRequest).toHaveBeenCalledWith(
        1, mockGetMailTemplate(MailTemplate.declined).templateID, undefined
      );
    });
  });

  describe('Update RSVP form', () => {
    test('Update RSVP form', async () => {
      await generateMockUniverseState();

      const user = await User.create({
        ...hackerUser,
        status: {
          accepted: true,
          statusReleased: true,
        },
        mailingListSubcriberID: 1,
      });

      await rsvp(
          user,
          {
            attending: true,
            form: {
              selectedCompanies: ["TEST"]
            }
          },
      );

      const resultObject = await User.findOne({
        _id: user._id,
      });

      expect(resultObject.toJSON().status.confirmed).toEqual(true);
      expect(resultObject.toJSON().status.declined).toEqual(false);
      expect(resultObject.toJSON().rsvpForm.selectedCompanies).toEqual(
          expect.arrayContaining(["TEST"])
      )

      // Verify confirmation email sent
      expect(sendEmailRequest).toHaveBeenCalledWith(
          1, mockGetMailTemplate(MailTemplate.confirmed).templateID, undefined
      );
    })
  })
});
