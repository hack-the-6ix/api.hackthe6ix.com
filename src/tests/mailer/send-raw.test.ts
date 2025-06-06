import sendEmail from '../../services/mailer/sendEmail';
import { sendEmailRequest } from '../../services/mailer/util/listmonk';
import { InternalServerError } from '../../types/errors';
import {
  runAfterAll,
  runAfterEach,
  runBeforeAll,
  runBeforeEach,
} from '../test-utils';
import { mockTags, mockTemplateID } from './test-utils';

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

jest.mock('../../services/mailer/util/listmonk', () => ({
  sendEmailRequest: jest.fn(),
}));

describe('Send Email', () => {
  beforeEach(() => {
    (sendEmailRequest as jest.Mock).mockClear();
  });

  test('Success', async () => {
    (sendEmailRequest as jest.Mock).mockResolvedValue({ status: 200, data: { data: {} } });

    const subscriberID = 123;
    await sendEmail(subscriberID, mockTemplateID, mockTags);

    expect(sendEmailRequest).toHaveBeenCalledWith(subscriberID, mockTemplateID, mockTags);
  });

  test('Success with no additional data', async () => {
    (sendEmailRequest as jest.Mock).mockResolvedValue({ status: 200, data: { data: {} } });

    const subscriberID = 123;
    await sendEmail(subscriberID, mockTemplateID);

    expect(sendEmailRequest).toHaveBeenCalledWith(subscriberID, mockTemplateID, undefined);
  });

  test('Fail', async () => {
    (sendEmailRequest as jest.Mock).mockResolvedValue({ status: 500 });

    const subscriberID = 123;
    await expect(sendEmail(subscriberID, mockTemplateID, mockTags)).rejects.toThrow(InternalServerError);
  });
});
