import sendEmail from '../../services/mailer/sendEmail';
import sendTemplateEmail from '../../services/mailer/sendTemplateEmail';
import { getTemplate } from '../../services/mailer/util/db';
import { MailTemplate } from '../../types/mailer';
import {
  runAfterAll,
  runAfterEach,
  runBeforeAll,
  runBeforeEach,
} from '../test-utils';
import { mockMailTemplate, mockTags } from './test-utils';

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

jest.mock('../../services/mailer/util/db', () => ({
  getTemplate: jest.fn(),
}));

jest.mock('../../services/mailer/sendEmail', () => jest.fn((): any => undefined));

test('Send template email', async () => {
  const mockTemplateName = 'template1';
  const mockTemplate = mockMailTemplate[mockTemplateName];
  (getTemplate as jest.Mock).mockResolvedValue(mockTemplate);

  const subscriberID = 123;

  await sendTemplateEmail(
    subscriberID,
    mockTemplateName as MailTemplate,
    mockTags,
  );

  expect(getTemplate).toHaveBeenCalledWith(mockTemplateName);
  expect(sendEmail).toHaveBeenCalledWith(
    subscriberID,
    mockTemplate.templateID,
    mockTags,
  );
});
