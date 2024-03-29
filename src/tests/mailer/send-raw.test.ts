import sendEmail from '../../services/mailer/sendEmail';
import { sendEmailRequest } from '../../services/mailer/util/external';
import { InternalServerError } from '../../types/errors';
import {
  hackerUser,
  mockErrorResponse,
  mockSuccessResponse,
  runAfterAll,
  runAfterEach,
  runBeforeAll,
  runBeforeEach,
} from '../test-utils';
import { mockSubject, mockTags, mockTagsParsed, mockTemplateID } from './test-utils';

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

jest.mock('../../services/mailer/util/external', () => ({
  addSubscriptionRequest: jest.fn(),
  deleteSubscriptionRequest: jest.fn(),
  getList: jest.fn(),
  getMailingListSubscriptionsRequest: jest.fn(),
  getTemplate: jest.fn(),
  sendEmailRequest: jest.fn(),
}));

describe('Send raw email', () => {
  describe('Success', () => {
    test('Tags', async () => {
      sendEmailRequest.mockReturnValue(mockSuccessResponse());

      await sendEmail(
        hackerUser.email,
        mockTemplateID,
        mockSubject,
        mockTags,
      );

      expect(sendEmailRequest).toHaveBeenCalledWith(
        hackerUser.email,
        mockTemplateID,
        mockSubject,
        mockTagsParsed,
      );
    });

    test('No Tags', async () => {
      sendEmailRequest.mockReturnValue(mockSuccessResponse());

      await sendEmail(
        hackerUser.email,
        mockTemplateID,
        mockSubject,
      );

      expect(sendEmailRequest).toHaveBeenCalledWith(
        hackerUser.email,
        mockTemplateID,
        mockSubject,
        {},
      );
    });
  });

  test('Fail', async () => {
    sendEmailRequest.mockReturnValue(mockErrorResponse());

    await expect(sendEmail(
      hackerUser.email,
      mockTemplateID,
      mockSubject,
      mockTags,
    )).rejects.toThrow(InternalServerError);
  });
});
