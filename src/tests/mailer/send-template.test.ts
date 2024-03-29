import User from '../../models/user/User';
import sendEmail from '../../services/mailer/sendEmail';
import sendTemplateEmail from '../../services/mailer/sendTemplateEmail';
import { okResponse } from '../../services/mailer/util/dev';
import { getTemplate, sendEmailRequest } from '../../services/mailer/util/external';
import { MailTemplate } from '../../types/mailer';
import {
  hackerUser,
  mockSuccessResponse,
  runAfterAll,
  runAfterEach,
  runBeforeAll,
  runBeforeEach,
} from '../test-utils';
import { mockSubject, mockTags, mockTemplateID, mockTemplateName } from './test-utils';

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

jest.mock('../../services/mailer/sendEmail', () => jest.fn((): any => undefined));

describe('Send template email', () => {
  test('Email corresponds to registered user', async () => {
    sendEmailRequest.mockReturnValue(mockSuccessResponse());

    const hacker = await User.create(hackerUser);

    getTemplate.mockReturnValue({
      subject: mockSubject,
      templateID: mockTemplateID,
    });

    await sendTemplateEmail(
      hacker.email,
      mockTemplateName as MailTemplate,
      mockTags,
    );

    const profileMergeFields = hacker.toJSON().mailmerge;

    expect(getTemplate).toHaveBeenCalledWith(mockTemplateName);
    expect(sendEmail).toHaveBeenCalledWith(
      hackerUser.email,
      mockTemplateID,
      mockSubject,
      {
        ...mockTags,
        ...profileMergeFields,
      },
    );
  });

  test('Email does not correspond to registered user', async () => {
    sendEmailRequest.mockReturnValue(okResponse);

    getTemplate.mockReturnValue({
      subject: mockSubject,
      templateID: mockTemplateID,
    });

    await sendTemplateEmail(
      'Banana smoothie',
      mockTemplateName as MailTemplate,
      mockTags,
    );

    expect(getTemplate).toHaveBeenCalledWith(mockTemplateName);
    expect(sendEmail).toHaveBeenCalledWith(
      'Banana smoothie',
      mockTemplateID,
      mockSubject,
      mockTags,
    );
  });
});
