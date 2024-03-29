import User from '../../models/user/User';
import sendAllTemplates from '../../services/mailer/sendAllTemplates';
import sendTemplateEmail from '../../services/mailer/sendTemplateEmail';
import {
  organizerUser,
  runAfterAll,
  runAfterEach,
  runBeforeAll,
  runBeforeEach,
} from '../test-utils';
import { mockMailTemplate } from './test-utils';

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

jest.mock('../../services/mailer/sendTemplateEmail', () => jest.fn((): any => undefined));
jest.mock('../../types/mailer', () => {
  const { mockMailTemplate } = jest.requireActual('./test-utils');
  return {
    MailTemplate: mockMailTemplate,
  };
});

test('Send all templates', async () => {
  const user = await User.create(organizerUser);
  const templateNames = await sendAllTemplates(user.toJSON());

  const augmentedTags: any = {};
  for (const k in user.toJSON().mailmerge) {
    augmentedTags[k] = `~${k} goes here~`;
  }

  expect(new Set(sendTemplateEmail.mock.calls)).toEqual(new Set(
    Object.keys(mockMailTemplate).map((template: string) => ([
      user.email, (mockMailTemplate as any)[template], augmentedTags,
    ])),
  ));

  expect(new Set(templateNames)).toEqual(new Set(Object.keys(mockMailTemplate)));
});
