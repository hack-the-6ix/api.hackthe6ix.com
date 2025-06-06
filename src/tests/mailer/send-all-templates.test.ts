import sendAllTemplates from '../../services/mailer/sendAllTemplates';
import sendTemplateEmail from '../../services/mailer/sendTemplateEmail';
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

jest.mock('../../services/mailer/sendTemplateEmail', () => jest.fn());
jest.mock('../../types/mailer', () => {
  const { mockMailTemplate } = jest.requireActual('./test-utils');
  return {
    MailTemplate: mockMailTemplate,
  };
});

test('Send all templates', async () => {
  const subscriberID = 123;
  const templateNames = await sendAllTemplates(subscriberID, mockTags);

  expect(new Set(sendTemplateEmail.mock.calls)).toEqual(new Set(
    Object.keys(mockMailTemplate).map((template: string) => ([
      subscriberID,
      (mockMailTemplate as any)[template],
      mockTags,
    ])),
  ));

  expect(new Set(templateNames)).toEqual(new Set(Object.keys(mockMailTemplate)));
});
