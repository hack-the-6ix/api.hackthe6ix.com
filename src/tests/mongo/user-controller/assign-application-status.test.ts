import cloneDeep from 'lodash.clonedeep';
import mongoose from 'mongoose';
import assignApplicationStatus from '../../../controller/applicationStatus/assignApplicationStatus';
import getRanks from '../../../controller/applicationStatus/getRanks';
import { fetchUniverseState } from '../../../controller/util/resources';
import { IUser } from '../../../models/user/fields';
import User from '../../../models/user/User';
import syncMailingLists from '../../../services/mailer/syncMailingLists';
import { BadRequestError } from '../../../types/errors';
import {
  generateMockUniverseState,
  hackerUser,
  mockDate,
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


jest.mock('../../../controller/applicationStatus/getRanks', () => jest.fn((): any => undefined));
jest.mock('../../../services/mailer/syncMailingLists', () => jest.fn((): any => undefined));

describe('Assign Application Status', () => {

  describe('Waitlist deadline', () => {
    test('Default', async () => {
      await generateMockUniverseState({
        maxAccept: 1,
        maxWaitlist: 0
      });

      const user = (await User.create({
        ...hackerUser,
        _id: new mongoose.Types.ObjectId(),
        status: {
          applied: true,
          waitlisted: true,
        },
      })).toJSON();

      getRanks.mockReturnValue(cloneDeep([user]));
      const { dead, accepted, waitlisted, rejected } = await assignApplicationStatus(false);

      expect(dead).toEqual([]);
      expect(waitlisted).toEqual([]);
      expect(accepted).toEqual([{
        ...user,
        status: {
          ...user.status,
          waitlisted: false,
          rejected: false,
          accepted: true,
          internalTextStatus: 'Accepted',
        },
        personalRSVPDeadline: (await fetchUniverseState()).public.globalWaitlistAcceptedConfirmationDeadline,
      }]);
      expect(rejected).toEqual([]);
    });

    describe('Override', () => {

      test('Success', async () => {
        await generateMockUniverseState({
          maxAccept: 1,
          maxWaitlist: 0
        });

        const user = (await User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            waitlisted: true,
          },
        })).toJSON();

        getRanks.mockReturnValue(cloneDeep([user]));
        const { dead, accepted, waitlisted, rejected } = await assignApplicationStatus(false, false, '696969');

        expect(dead).toEqual([]);
        expect(waitlisted).toEqual([]);
        expect(accepted).toEqual([{
          ...user,
          status: {
            ...user.status,
            waitlisted: false,
            rejected: false,
            accepted: true,
            internalTextStatus: 'Accepted',
          },
          personalRSVPDeadline: 696969,
        }]);
        expect(rejected).toEqual([]);

      });

      test('Error', async () => {
        await expect(assignApplicationStatus(false, false, 'ASdasdsad')).rejects.toThrow(BadRequestError);
      });

    });
  });

  describe('Legitness', () => {

    test('Legit mode', async () => {
      await generateMockUniverseState({
        maxAccept: 1,
        maxWaitlist: 1
      });

      const users = (await Promise.all([...new Array(3)].map(() => User.create({
        ...hackerUser,
        _id: new mongoose.Types.ObjectId(),
        status: {
          applied: true,
        },
      })))).map((u: IUser) => u.toJSON());

      // Some other rando user that should not have their status updated
      const rando = await User.create({
        ...hackerUser,
        _id: new mongoose.Types.ObjectId(),
        status: {
          applied: false,
        },
      });

      getRanks.mockReturnValue(cloneDeep(users));

      const { dead, accepted, waitlisted, rejected } = await assignApplicationStatus(true);

      expect(dead).toEqual([]);

      const acceptedExpected = {
        ...users[0],
        status: {
          ...users[0].status,
          accepted: true,
          waitlisted: false,
          rejected: false,
          internalTextStatus: 'Accepted',
        },
      };
      expect((await User.findOne({ _id: users[0]._id })).toJSON()).toEqual(acceptedExpected);
      expect(accepted).toEqual([acceptedExpected]);

      const waitlistedExpected = {
        ...users[1],
        status: {
          ...users[1].status,
          accepted: false,
          waitlisted: true,
          rejected: false,
          internalTextStatus: 'Waitlisted',
        },
      };
      expect((await User.findOne({ _id: users[1]._id })).toJSON()).toEqual(waitlistedExpected);
      expect(waitlisted).toEqual([waitlistedExpected]);

      const rejectedExpected = {
        ...users[2],
        status: {
          ...users[2].status,
          accepted: false,
          waitlisted: false,
          rejected: true,
          internalTextStatus: 'Rejected',
        },
      };
      expect((await User.findOne({ _id: users[2]._id })).toJSON()).toEqual(rejectedExpected);
      expect(rejected).toEqual([rejectedExpected]);

      expect(syncMailingLists).toHaveBeenCalled();
    });


    test('Not Legit mode', async () => {
      await generateMockUniverseState({
        maxAccept: 1,
        maxWaitlist: 1
      });

      const users = (await Promise.all([...new Array(3)].map(() => User.create({
        ...hackerUser,
        _id: new mongoose.Types.ObjectId(),
        status: {
          applied: true,
        },
      })))).map((u: IUser) => u.toJSON());

      // Some other rando user that should not have their status updated
      const rando = await User.create({
        ...hackerUser,
        _id: new mongoose.Types.ObjectId(),
        status: {
          applied: false,
        },
      });

      getRanks.mockReturnValue(cloneDeep(users));

      const { dead, accepted, waitlisted, rejected } = await assignApplicationStatus(false);

      expect(dead).toEqual([]);

      const acceptedExpected = {
        ...users[0],
        status: {
          ...users[0].status,
          accepted: true,
          waitlisted: false,
          rejected: false,
          internalTextStatus: 'Accepted',
        },
      };
      // The status should not have changed at all on the database side
      expect((await User.findOne({ _id: users[0]._id })).toJSON()).toEqual(users[0]);
      expect(accepted).toEqual([acceptedExpected]);

      const waitlistedExpected = {
        ...users[1],
        status: {
          ...users[1].status,
          accepted: false,
          waitlisted: true,
          rejected: false,
          internalTextStatus: 'Waitlisted',
        },
      };
      expect((await User.findOne({ _id: users[1]._id })).toJSON()).toEqual(users[1]);
      expect(waitlisted).toEqual([waitlistedExpected]);

      const rejectedExpected = {
        ...users[2],
        status: {
          ...users[2].status,
          accepted: false,
          waitlisted: false,
          rejected: true,
          internalTextStatus: 'Rejected',
        },
      };
      expect((await User.findOne({ _id: users[2]._id })).toJSON()).toEqual(users[2]);
      expect(rejected).toEqual([rejectedExpected]);

      expect(syncMailingLists).toHaveBeenCalled();
    });

  });

  describe('Functionality', () => {
    test('Fresh slate', async () => {
      await generateMockUniverseState({
        maxAccept: 3,
        maxWaitlist: 2
      });

      const users = (await Promise.all([...new Array(10)].map(() => User.create({
        ...hackerUser,
        _id: new mongoose.Types.ObjectId(),
        status: {
          applied: true,
        },
      })))).map((u: IUser) => u.toJSON());

      // Some other rando user that should not have their status updated
      const rando = await User.create({
        ...hackerUser,
        _id: new mongoose.Types.ObjectId(),
        status: {
          applied: false,
        },
      });

      getRanks.mockReturnValue(cloneDeep(users));

      const { dead, accepted, waitlisted, rejected } = await assignApplicationStatus();

      expect(dead).toEqual([]);
      expect(accepted).toEqual([users[0], users[1], users[2]].map((u: IUser) => ({
        ...u,
        status: {
          ...u.status,
          accepted: true,
          waitlisted: false,
          rejected: false,
          internalTextStatus: 'Accepted',
        },
      })));
      expect(waitlisted).toEqual([users[3], users[4]].map((u: IUser) => ({
        ...u,
        status: {
          ...u.status,
          waitlisted: true,
          accepted: false,
          rejected: false,
          internalTextStatus: 'Waitlisted',
        },
      })));
      expect(rejected).toEqual([users[5], users[6], users[7], users[8], users[9]].map((u: IUser) => ({
        ...u,
        status: {
          ...u.status,
          rejected: true,
          accepted: false,
          waitlisted: false,
          internalTextStatus: 'Rejected',
        },
      })));
      expect(syncMailingLists).toHaveBeenCalled();
    });

    test('Existing accepted and waitlisted users', async () => {
      await generateMockUniverseState({
        maxAccept: 3,
        maxWaitlist: 2
      });

      const users = (await Promise.all([
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            accepted: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            accepted: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            waitlisted: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
          },
        }),
      ])).map((u: IUser) => u.toJSON());

      // Some other rando user that should not have their status updated
      const rando = await User.create({
        ...hackerUser,
        _id: new mongoose.Types.ObjectId(),
        status: {
          applied: false,
        },
      });

      getRanks.mockReturnValue(cloneDeep(users));

      const { dead, accepted, waitlisted, rejected } = await assignApplicationStatus();

      expect(dead).toEqual([]);
      expect(accepted).toEqual([users[0], users[1], users[2]].map((u: IUser) => ({
        ...u,
        status: {
          ...u.status,
          accepted: true,
          waitlisted: false,
          rejected: false,
          internalTextStatus: 'Accepted',
        },
      })));
      expect(waitlisted).toEqual([users[3], users[4]].map((u: IUser) => ({
        ...u,
        status: {
          ...u.status,
          waitlisted: true,
          accepted: false,
          rejected: false,
          internalTextStatus: 'Waitlisted',
        },
      })));
      expect(rejected).toEqual([users[5]].map((u: IUser) => ({
        ...u,
        status: {
          ...u.status,
          rejected: true,
          accepted: false,
          waitlisted: false,
          internalTextStatus: 'Rejected',
        },
      })));
      expect(syncMailingLists).toHaveBeenCalled();
    });

    test('Existing accepted and waitlisted users -- No changes', async () => {
      await generateMockUniverseState({
        maxAccept: 0,
        maxWaitlist: 0
      });

      const users = (await Promise.all([
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            accepted: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            accepted: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            waitlisted: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            rejected: true,
          },
        }),
      ])).map((u: IUser) => u.toJSON());

      // Some other rando user that should not have their status updated
      const rando = await User.create({
        ...hackerUser,
        _id: new mongoose.Types.ObjectId(),
        status: {
          applied: false,
        },
      });

      getRanks.mockReturnValue(cloneDeep(users));

      const { dead, accepted, waitlisted, rejected } = await assignApplicationStatus();

      expect(dead).toEqual([]);
      expect(accepted).toEqual([users[0], users[1]].map((u: IUser) => ({
        ...u,
        status: {
          ...u.status,
          accepted: true,
          waitlisted: false,
          rejected: false,
        },
      })));
      expect(waitlisted).toEqual([users[2]].map((u: IUser) => ({
        ...u,
        status: {
          ...u.status,
          waitlisted: true,
          accepted: false,
          rejected: false,
        },
      })));
      expect(rejected).toEqual([users[3]].map((u: IUser) => ({
        ...u,
        status: {
          ...u.status,
          rejected: true,
          accepted: false,
          waitlisted: false,
        },
      })));
      expect(syncMailingLists).toHaveBeenCalled();
    });

    test('Existing rejected and declined users', async () => {
      await generateMockUniverseState({
        maxAccept: 3,
        maxWaitlist: 2
      });

      const users = (await Promise.all([
        User.create({ // Accept
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
          },
        }),
        User.create({ // Expired, skip
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            accepted: true,
          },
          personalRSVPDeadline: -1,
        }),
        User.create({ // Accept
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            accepted: true,
          },
        }),
        User.create({ // Declined, Skip
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            accepted: true,
            declined: true,
          },
        }),
        User.create({ // Waitlist -- we reached acceptance cap
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
          },
        }),
        User.create({ // rejected, Skip
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            rejected: true,
          },
        }),
        User.create({ // Waitlist
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            waitlisted: true,
          },
        }),
        User.create({ // Reject
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
          },
        }),
        User.create({ // Reject
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
          },
        }),
        User.create({ // Accept - was already accepted
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            accepted: true,
            confirmed: true,
          },
        }),
      ])).map((u: IUser) => u.toJSON());

      // Some other rando user that should not have their status updated
      const rando = await User.create({
        ...hackerUser,
        _id: new mongoose.Types.ObjectId(),
        status: {
          applied: false,
        },
      });

      getRanks.mockReturnValue(cloneDeep(users));

      const { dead, accepted, waitlisted, rejected } = await assignApplicationStatus();

      expect(dead).toEqual([users[1], users[3]]);
      const expectedAcceptedUsers = [users[0], users[2], users[9]].map((u: IUser) => ({
        ...u,
        status: {
          ...u.status,
          accepted: true,
          waitlisted: false,
          rejected: false,
          internalTextStatus: 'Accepted',
        },
      }));
      expectedAcceptedUsers[2].status.internalTextStatus = 'Confirmed';

      expect(accepted).toEqual(expectedAcceptedUsers);
      expect(waitlisted).toEqual([users[4], users[6]].map((u: IUser) => ({
        ...u,
        status: {
          ...u.status,
          waitlisted: true,
          accepted: false,
          rejected: false,
          internalTextStatus: 'Waitlisted',
        },
      })));
      expect(rejected).toEqual([users[5], users[7], users[8]].map((u: IUser) => ({
        ...u,
        status: {
          ...u.status,
          rejected: true,
          accepted: false,
          waitlisted: false,
          internalTextStatus: 'Rejected',
        },
      })));
      expect(syncMailingLists).toHaveBeenCalled();
    });

    test('Accept waitlisted people', async () => {
      await generateMockUniverseState({
        maxAccept: 5,
        maxWaitlist: 2
      });

      const users = (await Promise.all([
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            accepted: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            accepted: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            waitlisted: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
          },
        }),
      ])).map((u: IUser) => u.toJSON());

      // Some other rando user that should not have their status updated
      const rando = await User.create({
        ...hackerUser,
        _id: new mongoose.Types.ObjectId(),
        status: {
          applied: false,
        },
      });

      getRanks.mockReturnValue(cloneDeep(users));

      const mockTimestamp = 69696969;

      const restoreDateMock = mockDate(mockTimestamp);
      const { dead, accepted, waitlisted, rejected } = await assignApplicationStatus();
      restoreDateMock();

      expect(dead).toEqual([]);
      const mockAcceptedUsers = [users[0], users[1], users[2], users[3], users[4]].map((u: IUser) => ({
        ...u,
        status: {
          ...u.status,
          accepted: true,
          waitlisted: false,
          rejected: false,
          internalTextStatus: 'Accepted',
        },
      }));
      mockAcceptedUsers[3].personalRSVPDeadline = (await fetchUniverseState()).public.globalWaitlistAcceptedConfirmationDeadline; // Formerly waitlisted user is now given a week to respond
      expect(accepted).toEqual(mockAcceptedUsers);
      expect(waitlisted).toEqual([users[5], users[6]].map((u: IUser) => ({
        ...u,
        status: {
          ...u.status,
          waitlisted: true,
          accepted: false,
          rejected: false,
          internalTextStatus: 'Waitlisted',
        },
      })));
      expect(rejected).toEqual([users[7]].map((u: IUser) => ({
        ...u,
        status: {
          ...u.status,
          rejected: true,
          accepted: false,
          waitlisted: false,
          internalTextStatus: 'Rejected',
        },
      })));
      expect(syncMailingLists).toHaveBeenCalled();
    });

    test('Waitlist Over', async () => {
      await generateMockUniverseState({
        maxAccept: 3,
        maxWaitlist: 3
      });

      const mockTimestamp = 69696969;

      const users = (await Promise.all([
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            waitlisted: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            accepted: true,
            confirmed: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            rejected: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            accepted: true,
            declined: true,
          },
        }),
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          status: {
            applied: true,
            accepted: true,
          },
          personalRSVPDeadline: mockTimestamp + 1000,
        }),
      ])).map((u: IUser) => u.toJSON());

      // Some other rando user that should not have their status updated
      const rando = await User.create({
        ...hackerUser,
        _id: mongoose.Types.ObjectId(),
        status: {
          applied: false,
        },
      });

      getRanks.mockReturnValue(cloneDeep(users));

      const restoreDateMock = mockDate(mockTimestamp);
      const { dead, accepted, waitlisted, rejected } = await assignApplicationStatus(false, true);
      restoreDateMock();

      expect(dead).toEqual([users[8]]);

      const expectedAcceptedUsers = [users[0], users[5], users[9]].map((u: IUser) => ({
        ...u,
        status: {
          ...u.status,
          accepted: true,
          waitlisted: false,
          rejected: false,
          internalTextStatus: 'Accepted',
        },
      }));
      expectedAcceptedUsers[1].status.internalTextStatus = 'Confirmed';

      expect(accepted).toEqual(expectedAcceptedUsers);
      expect(waitlisted).toEqual([]);

      // #6 is sent to the beginning since existing rejected users are added to the list first
      expect(rejected).toEqual([users[6], users[1], users[2], users[3], users[4], users[7]].map((u: IUser) => ({
        ...u,
        status: {
          ...u.status,
          rejected: true,
          accepted: false,
          waitlisted: false,
          internalTextStatus: 'Rejected',
        },
      })));
      expect(syncMailingLists).toHaveBeenCalled();
    });
  });
});
