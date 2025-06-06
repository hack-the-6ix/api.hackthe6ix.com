import User from '../../models/user/User';
import { addSubscriptionsRequest } from '../../services/mailer/util/listmonk';
import { getList } from '../../services/mailer/util/db';
import verifyMailingList from '../../services/mailer/verifyMailingList';
import {
  organizerUser,
  runAfterAll,
  runAfterEach,
  runBeforeAll,
  runBeforeEach,
} from '../test-utils';
import { mockGetList, mockMailingLists } from './test-utils';

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
  addSubscriptionsRequest: jest.fn(),
}));

jest.mock('../../services/mailer/util/db', () => ({
  getList: jest.fn(),
}));

jest.mock('../../types/mailer', () => {
  const { mockMailingLists } = jest.requireActual('./test-utils');
  return {
    MailingList: mockMailingLists,
  };
});

test('Verify lists', async () => {
  (getList as jest.Mock).mockImplementation((x: string) => (mockGetList as any)[x]);

  const user = await User.create(organizerUser);
  const subscriberID = 123;

  const listNames = await verifyMailingList(user, subscriberID);

  expect(new Set(addSubscriptionsRequest.mock.calls)).toEqual(new Set(
    Object.keys(mockMailingLists).map((list: string) => ([
      mockGetList[list].listID, [subscriberID],
    ])),
  ));

  expect(new Set(listNames)).toEqual(new Set(Object.keys(mockMailingLists)));
});
