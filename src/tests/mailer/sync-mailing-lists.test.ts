import mongoose from 'mongoose';
import User from '../../models/user/User';
import DynamicCacheProvider from '../../services/cache';
import syncMailingList from '../../services/mailer/syncMailingList';
import syncMailingLists from '../../services/mailer/syncMailingLists';
import { getList } from '../../services/mailer/util/db';
import userInList from '../../services/mailer/util/user_in_list';
import { hackerUser, runAfterAll, runAfterEach, runBeforeAll, runBeforeEach } from '../test-utils';
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

jest.mock('../../services/mailer/util/db', () => ({
  getList: jest.fn(),
}));

jest.mock('../../services/mailer/syncMailingList', () => jest.fn());
jest.mock('../../services/mailer/util/user_in_list', () => jest.fn());

jest.mock('../../types/mailer', () => {
  const { mockMailingLists } = jest.requireActual('./test-utils');
  return {
    MailingList: mockMailingLists,
  };
});

// this effectively disables the cache so that
// the list config can be changed between tests without
// needing to make up new list names
jest.spyOn(DynamicCacheProvider.prototype, 'get')
  .mockImplementation(async function(key) {
    return await (this as any)._provider(key);
  });

describe('Sync Mailing Lists', () => {
  beforeEach(() => {
    (syncMailingList as jest.Mock).mockClear();
    (getList as jest.Mock).mockClear();
    (userInList as jest.Mock).mockClear();
  });

  test('Sync all mailing lists', async () => {
    (getList as jest.Mock).mockImplementation((x: string) => (mockGetList as any)[x]);
    (userInList as jest.Mock).mockReturnValue(true);

    const user1 = await User.create({ ...hackerUser, _id: new mongoose.Types.ObjectId(), email: 'user1@test.com', mailingListSubcriberID: 1 });
    const user2 = await User.create({ ...hackerUser, _id: new mongoose.Types.ObjectId(), email: 'user2@test.com', mailingListSubcriberID: 2, firstName: 'Apple' });
    const user3 = await User.create({ ...hackerUser, _id: new mongoose.Types.ObjectId(), email: 'user3@test.com', mailingListSubcriberID: 3, firstName: 'Banana' });
    
    await syncMailingLists();

    expect(syncMailingList).toHaveBeenCalledTimes(Object.keys(mockMailingLists).length);
    expect(syncMailingList).toHaveBeenCalledWith(mockGetList.list1.listID, [user2.mailingListSubcriberID]);
    expect(syncMailingList).toHaveBeenCalledWith(mockGetList.list2.listID, [user3.mailingListSubcriberID]);
    expect(syncMailingList).toHaveBeenCalledWith(mockGetList.list3.listID, [user1.mailingListSubcriberID, user2.mailingListSubcriberID, user3.mailingListSubcriberID]);
  });

  test('Sync specific mailing lists', async () => {
    (getList as jest.Mock).mockImplementation((x: string) => (mockGetList as any)[x]);
    (userInList as jest.Mock).mockReturnValue(true);

    await User.create({ ...hackerUser, _id: new mongoose.Types.ObjectId(), email: 'user1@test.com', mailingListSubcriberID: 1 });
    const user2 = await User.create({ ...hackerUser, _id: new mongoose.Types.ObjectId(), email: 'user2@test.com', mailingListSubcriberID: 2, firstName: 'Apple' });
    await User.create({ ...hackerUser, _id: new mongoose.Types.ObjectId(), email: 'user3@test.com', mailingListSubcriberID: 3, firstName: 'Banana' });
    
    const selectedLists = ['list1'];
    await syncMailingLists(selectedLists);

    expect(syncMailingList).toHaveBeenCalledTimes(1);
    expect(syncMailingList).toHaveBeenCalledWith(mockGetList.list1.listID, [user2.mailingListSubcriberID]);
  });

  test('User filtering', async () => {
    (getList as jest.Mock).mockImplementation((x: string) => (mockGetList as any)[x]);
    
    const user1 = await User.create({ ...hackerUser, _id: new mongoose.Types.ObjectId(), email: 'user1@test.com', mailingListSubcriberID: 1, firstName: 'Apple' });
    await User.create({ ...hackerUser, _id: new mongoose.Types.ObjectId(), email: 'user2@test.com', mailingListSubcriberID: 2, firstName: 'Apple' });
    
    (userInList as jest.Mock).mockImplementation((u: any) => u.email === user1.email);

    await syncMailingLists(['list1']);

    expect(syncMailingList).toHaveBeenCalledTimes(1);
    expect(syncMailingList).toHaveBeenCalledWith(mockGetList.list1.listID, [user1.mailingListSubcriberID]);
  });

  test('No subscriberID', async () => {
    (getList as jest.Mock).mockImplementation((x: string) => (mockGetList as any)[x]);
    (userInList as jest.Mock).mockReturnValue(true);

    await User.create({ ...hackerUser, _id: new mongoose.Types.ObjectId(), email: 'user1@test.com', firstName: 'Apple' });
    
    await syncMailingLists(['list1']);

    expect(syncMailingList).toHaveBeenCalledTimes(1);
    expect(syncMailingList).toHaveBeenCalledWith(mockGetList.list1.listID, []);
  });
});
