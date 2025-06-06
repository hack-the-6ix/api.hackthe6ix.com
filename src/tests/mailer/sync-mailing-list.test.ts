import syncMailingList from '../../services/mailer/syncMailingList';
import {
  addSubscriptionsRequest,
  deleteSubscriptionsRequest,
  getMailingListSubscriptionsRequest,
} from '../../services/mailer/util/listmonk';
import { InternalServerError } from '../../types/errors';
import {
  runAfterAll,
  runAfterEach,
  runBeforeAll,
  runBeforeEach,
} from '../test-utils';

const mockSubscribersA = [1, 2, 3];
const mockSubscribersB = [2, 3, 4];
const mockSubscribersEmpty: number[] = [];
const mockMailingListID = 123;

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
  addSubscriptionsRequest: jest.fn((mailingListID: number, subscriberIDs: number[]) => {
    if (subscriberIDs.length === 0) {
      return Promise.resolve();
    }
    return Promise.resolve();
  }),
  deleteSubscriptionsRequest: jest.fn((mailingListID: number, subscriberIDs: number[]) => {
    if (subscriberIDs.length === 0) {
      return Promise.resolve();
    }
    return Promise.resolve();
  }),
  getMailingListSubscriptionsRequest: jest.fn(),
}));

describe('Sync Mailing List', () => {
  beforeEach(() => {
    (addSubscriptionsRequest as jest.Mock).mockClear();
    (deleteSubscriptionsRequest as jest.Mock).mockClear();
    (getMailingListSubscriptionsRequest as jest.Mock).mockClear();
  });

  describe('Success', () => {
    test('Add new subscribers', async () => {
      (getMailingListSubscriptionsRequest as jest.Mock)
        .mockResolvedValueOnce(mockSubscribersEmpty)
        .mockResolvedValueOnce(mockSubscribersA);

      const { added, deleted } = await syncMailingList(mockMailingListID, mockSubscribersA);

      expect(getMailingListSubscriptionsRequest).toHaveBeenCalledTimes(2);
      expect(addSubscriptionsRequest).toHaveBeenCalledWith(mockMailingListID, mockSubscribersA);
      expect(deleteSubscriptionsRequest).not.toHaveBeenCalled();
      expect(added).toEqual(mockSubscribersA);
      expect(deleted).toEqual([]);
    });

    test('Remove subscribers', async () => {
        (getMailingListSubscriptionsRequest as jest.Mock)
        .mockResolvedValueOnce(mockSubscribersA)
        .mockResolvedValueOnce(mockSubscribersEmpty);

      const { added, deleted } = await syncMailingList(mockMailingListID, mockSubscribersEmpty);

      expect(getMailingListSubscriptionsRequest).toHaveBeenCalledTimes(2);
      expect(addSubscriptionsRequest).not.toHaveBeenCalled();
      expect(deleteSubscriptionsRequest).toHaveBeenCalledWith(mockMailingListID, mockSubscribersA);
      expect(added).toEqual([]);
      expect(deleted).toEqual(mockSubscribersA);
    });

    test('Add and remove subscribers', async () => {
        (getMailingListSubscriptionsRequest as jest.Mock)
        .mockResolvedValueOnce(mockSubscribersA)
        .mockResolvedValueOnce(mockSubscribersB);

      const { added, deleted } = await syncMailingList(mockMailingListID, mockSubscribersB);

      expect(getMailingListSubscriptionsRequest).toHaveBeenCalledTimes(2);
      expect(addSubscriptionsRequest).toHaveBeenCalledWith(mockMailingListID, [4]);
      expect(deleteSubscriptionsRequest).toHaveBeenCalledWith(mockMailingListID, [1]);
      expect(added).toEqual([4]);
      expect(deleted).toEqual([1]);
    });

    test('No change', async () => {
        (getMailingListSubscriptionsRequest as jest.Mock)
        .mockResolvedValueOnce(mockSubscribersA)
        .mockResolvedValueOnce(mockSubscribersA);

      const { added, deleted } = await syncMailingList(mockMailingListID, mockSubscribersA);

      expect(getMailingListSubscriptionsRequest).toHaveBeenCalledTimes(2);
      expect(addSubscriptionsRequest).not.toHaveBeenCalled();
      expect(deleteSubscriptionsRequest).not.toHaveBeenCalled();
      expect(added).toEqual([]);
      expect(deleted).toEqual([]);
    });
  });

  describe('Error', () => {
    test('Verification fails (length mismatch)', async () => {
        (getMailingListSubscriptionsRequest as jest.Mock)
        .mockResolvedValueOnce(mockSubscribersA)
        .mockResolvedValueOnce(mockSubscribersA); // Return wrong list for verification

      await expect(syncMailingList(mockMailingListID, mockSubscribersB)).rejects.toThrow(InternalServerError);
    });

    test('Verification fails (subscriber mismatch)', async () => {
      const finalSubscribers = [2, 3, 5]; // one different subscriber
      (getMailingListSubscriptionsRequest as jest.Mock)
        .mockResolvedValueOnce(mockSubscribersA)
        .mockResolvedValueOnce(finalSubscribers);

      await expect(syncMailingList(mockMailingListID, mockSubscribersB)).rejects.toThrow(InternalServerError);
    });
  });
});
