import { fetchUser } from '../../../controller/UserController';
import { fetchUniverseState } from '../../../controller/util/resources';
import Settings from '../../../models/settings/Settings';
import { enumOptions } from '../../../models/user/enums';
import { IUser } from '../../../models/user/fields';
import User from '../../../models/user/User';
import {
  canRSVP,
  canUpdateApplication,
  getApplicationDeadline,
  getRSVPDeadline,
  isApplicationExpired,
  isApplicationOpen,
  isRSVPExpired,
  isRSVPOpen,
} from '../../../models/validator';
import { stringifyUnixTime } from '../../../util/date';
import {
  generateMockUniverseState,
  hackerUser,
  organizerUser,
  runAfterAll,
  runAfterEach,
  runBeforeAll,
  runBeforeEach,
} from '../../test-utils';
import { totalAvailablePoints } from '../../../consts';

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

jest.mock('../../../models/validator', () => {
  const validators = jest.requireActual('../../../models/validator');
  return {
    ...validators,
    canUpdateApplication: jest.fn(),
    canRSVP: jest.fn(),
    isRSVPOpen: jest.fn(),
    getApplicationDeadline: jest.fn(),
    getRSVPDeadline: jest.fn(),
    isApplicationOpen: jest.fn(),
    isRSVPExpired: jest.fn(),
    isApplicationExpired: jest.fn(),
  };
});

describe('Interceptor', () => {
  describe('Status', () => {
    const baseStatus = {
      applied: true,
      accepted: true,
      rejected: true,
      waitlisted: true,
      confirmed: true,
      declined: true,
      checkedIn: true,
    };

    describe('Hacker', () => {
      beforeEach(() => {
        canUpdateApplication.mockReturnValue(() => true);
        canRSVP.mockReturnValue(() => true);
      });

      test('Released', async () => {
        const user = await User.create({
          ...hackerUser,
          status: {
            ...baseStatus,
            statusReleased: true,
          },
        });

        const fetchedUser = await fetchUser(user);

        expect(fetchedUser.status).toMatchObject(baseStatus);
      });

      test('Not released', async () => {
        const user = await User.create({
          ...hackerUser,
          status: {
            ...baseStatus,
            statusReleased: false,
          },
        });

        const fetchedUser = await fetchUser(user);

        expect(fetchedUser.status).toMatchObject({
          applied: true,
          accepted: false,
          rejected: false,
          waitlisted: false,
          confirmed: true,
          declined: true,
          checkedIn: true,
        });
      });
    });

    test('Organizer', async () => {
      const status = {
        ...baseStatus,
        statusReleased: false,
      };

      const user = await User.create({
        ...organizerUser,
        status: status,
      });

      const fetchedUser = await fetchUser(user);

      expect(fetchedUser.status).toMatchObject(status);
    });
  });
});

describe('Virtual', () => {
  describe('Can Amend Team', () => {
    beforeEach(() =>
      canRSVP.mockImplementation(
        jest.requireActual('../../../models/validator').canRSVP,
      ),
    );
    beforeEach(() =>
      canUpdateApplication.mockImplementation(
        jest.requireActual('../../../models/validator').canUpdateApplication,
      ),
    );

    test('Success', async () => {
      isApplicationOpen.mockReturnValue(true);
      const user = await User.create(hackerUser);
      const fetchedUser = await fetchUser(user);

      expect(fetchedUser.status.canAmendTeam).toBeTruthy();
    });

    test('Fail', async () => {
      isApplicationOpen.mockReturnValue(false);
      const user = await User.create(hackerUser);
      const fetchedUser = await fetchUser(user);

      expect(fetchedUser.status.canAmendTeam).toBeFalsy();
    });
  });

  describe('Can Apply', () => {
    beforeEach(() =>
      canRSVP.mockImplementation(
        jest.requireActual('../../../models/validator').canRSVP,
      ),
    );

    test('Success', async () => {
      canUpdateApplication.mockReturnValue(true);

      const user = await User.create(hackerUser);
      const fetchedUser = await fetchUser(user);

      expect(fetchedUser.status.canApply).toBeTruthy();
    });

    test('Fail', async () => {
      canUpdateApplication.mockReturnValue(false);
      const user = await User.create(hackerUser);
      const fetchedUser = await fetchUser(user);

      expect(fetchedUser.status.canApply).toBeFalsy();
    });
  });

  describe('Can Confirm', () => {
    beforeEach(() =>
      canUpdateApplication.mockImplementation(
        jest.requireActual('../../../models/validator').canUpdateApplication,
      ),
    );

    test('Success', async () => {
      canRSVP.mockReturnValue(true);
      const user = await User.create(hackerUser);
      const fetchedUser = await fetchUser(user);

      expect(fetchedUser.status.canRSVP).toBeTruthy();
    });

    test('Fail', async () => {
      canRSVP.mockReturnValue(false);
      const user = await User.create(hackerUser);
      const fetchedUser = await fetchUser(user);

      expect(fetchedUser.status.canRSVP).toBeFalsy();
    });
  });

  describe('Is Confirmation Open', () => {
    beforeEach(() =>
      canUpdateApplication.mockImplementation(
        jest.requireActual('../../../models/validator').canUpdateApplication,
      ),
    );

    test('Success', async () => {
      isRSVPOpen.mockReturnValue(true);
      const user = await User.create(hackerUser);
      const fetchedUser = await fetchUser(user);

      expect(fetchedUser.status.isRSVPOpen).toBeTruthy();
    });

    test('Fail', async () => {
      isRSVPOpen.mockReturnValue(false);
      const user = await User.create(hackerUser);
      const fetchedUser = await fetchUser(user);

      expect(fetchedUser.status.isRSVPOpen).toBeFalsy();
    });
  });

  describe('RSVP Expired', () => {
    beforeEach(() =>
      isRSVPExpired.mockImplementation(
        jest.requireActual('../../../models/validator').isRSVPExpired,
      ),
    );

    test('Success', async () => {
      isRSVPExpired.mockReturnValue(true);
      const user = await User.create(hackerUser);
      const fetchedUser = await fetchUser(user);

      expect(fetchedUser.status.rsvpExpired).toBeTruthy();
    });

    test('Fail', async () => {
      isRSVPExpired.mockReturnValue(false);
      const user = await User.create(hackerUser);
      const fetchedUser = await fetchUser(user);

      expect(fetchedUser.status.rsvpExpired).toBeFalsy();
    });
  });

  describe('Application Expired', () => {
    beforeEach(() =>
      isApplicationExpired.mockImplementation(
        jest.requireActual('../../../models/validator').isApplicationExpired,
      ),
    );

    test('Success', async () => {
      isApplicationExpired.mockReturnValue(true);
      const user = await User.create(hackerUser);
      const fetchedUser = await fetchUser(user);

      expect(fetchedUser.status.applicationExpired).toBeTruthy();
    });

    test('Fail', async () => {
      isApplicationExpired.mockReturnValue(false);
      const user = await User.create(hackerUser);
      const fetchedUser = await fetchUser(user);

      expect(fetchedUser.status.applicationExpired).toBeFalsy();
    });
  });

  describe('Computed Deadlines', () => {
    beforeEach(() => {
      canUpdateApplication.mockImplementation(
        jest.requireActual('../../../models/validator').canUpdateApplication,
      );
      canRSVP.mockImplementation(
        jest.requireActual('../../../models/validator').canRSVP,
      );
      getApplicationDeadline.mockImplementation(
        jest.requireActual('../../../models/validator').getApplicationDeadline,
      );
      getRSVPDeadline.mockImplementation(
        jest.requireActual('../../../models/validator').getRSVPDeadline,
      );
    });

    describe('Application', () => {
      describe('Personal Deadline', () => {
        test('Global in the future', async () => {
          await generateMockUniverseState();
          const personalDeadline = new Date().getTime();

          const user = await User.create({
            ...hackerUser,
            personalApplicationDeadline: personalDeadline,
          });
          const fetchedUser = await fetchUser(user);
          expect(fetchedUser.computedApplicationDeadline).toEqual(
            personalDeadline,
          );
        });
        test('Global in the Past', async () => {
          await generateMockUniverseState({
            applyOffset: -10000,
          });
          const personalDeadline = new Date().getTime();

          const user = await User.create({
            ...hackerUser,
            personalApplicationDeadline: personalDeadline,
          });
          const fetchedUser = await fetchUser(user);
          expect(fetchedUser.computedApplicationDeadline).toEqual(
            personalDeadline,
          );
        });
      });
      test('No Personal Deadline', async () => {
        await generateMockUniverseState();

        const user = await User.create(hackerUser);
        const fetchedUser = await fetchUser(user);
        expect(fetchedUser.computedApplicationDeadline).toEqual(
          (await fetchUniverseState()).public.globalApplicationDeadline,
        );
      });
    });
    describe('Confirmation', () => {
      describe('Personal Deadline', () => {
        test('Global in the future', async () => {
          await generateMockUniverseState();
          const personalDeadline = new Date().getTime();

          const user = await User.create({
            ...hackerUser,
            personalRSVPDeadline: personalDeadline,
          });
          const fetchedUser = await fetchUser(user);
          expect(fetchedUser.computedRSVPDeadline).toEqual(personalDeadline);
        });
        test('Global in the Past', async () => {
          await generateMockUniverseState({
            confirmOffset: -10000,
          });
          const personalDeadline = new Date().getTime();

          const user = await User.create({
            ...hackerUser,
            personalRSVPDeadline: personalDeadline,
          });
          const fetchedUser = await fetchUser(user);
          expect(fetchedUser.computedRSVPDeadline).toEqual(personalDeadline);
        });
      });
      test('No Personal Deadline', async () => {
        await generateMockUniverseState();

        const user = await User.create(hackerUser);
        const fetchedUser = await fetchUser(user);
        expect(fetchedUser.computedRSVPDeadline).toEqual(
          (await fetchUniverseState()).public.globalConfirmationDeadline,
        );
      });
    });
  });

  describe('Mail Merge', () => {
    beforeEach(() => {
      canUpdateApplication.mockImplementation(
        jest.requireActual('../../../models/validator').canUpdateApplication,
      );
      canRSVP.mockImplementation(
        jest.requireActual('../../../models/validator').canRSVP,
      );
    });

    test('First Name', async () => {
      const user = await User.create(organizerUser);
      const fetchedUser = await fetchUser(user);
      expect(fetchedUser.mailmerge.FIRST_NAME).toEqual(user.firstName);
    });
    test('Last Name', async () => {
      const user = await User.create(organizerUser);
      const fetchedUser = await fetchUser(user);
      expect(fetchedUser.mailmerge.LAST_NAME).toEqual(user.lastName);
    });
    test('Application Deadline', async () => {
      const mockDate = 12345;
      getApplicationDeadline.mockReturnValue(mockDate);

      await Settings.create({});

      const user = await User.create(organizerUser);
      const fetchedUser = await fetchUser(user);

      expect(fetchedUser.mailmerge.MERGE_APPLICATION_DEADLINE).toEqual(
        stringifyUnixTime(mockDate),
      );
    });
    test('Confirmation Deadline', async () => {
      const mockDate = 54321;
      getRSVPDeadline.mockReturnValue(mockDate);

      const user = await User.create(organizerUser);
      const fetchedUser = await fetchUser(user);

      expect(fetchedUser.mailmerge.MERGE_CONFIRMATION_DEADLINE).toEqual(
        stringifyUnixTime(mockDate),
      );
    });
  });

  describe('Text Status', () => {
    beforeEach(() => {
      isRSVPExpired.mockReturnValue(false);
      isApplicationExpired.mockReturnValue(false);
    });

    test('Invitation Expired', async () => {
      isRSVPExpired.mockReturnValue(true);

      const user: IUser = await User.create({
        ...hackerUser,
      });

      expect(user.status.textStatus).toEqual('Invitation Expired');
    });

    test('Application Expired', async () => {
      isApplicationExpired.mockReturnValue(true);

      const user: IUser = await User.create({
        ...hackerUser,
      });

      expect(user.status.textStatus).toEqual('Application Expired');
    });

    test('Not applied', async () => {
      const user: IUser = await User.create({
        ...hackerUser,
      });

      expect(user.status.textStatus).toEqual('Not Applied');
    });

    test('Applied', async () => {
      const user: IUser = await User.create({
        ...hackerUser,
        status: {
          applied: true,
        },
      });

      expect(user.status.textStatus).toEqual('Applied');
    });

    describe('Status Released', () => {
      test('Accepted', async () => {
        const user: IUser = await User.create({
          ...hackerUser,
          status: {
            applied: true,
            accepted: true,
            statusReleased: true,
          },
        });

        expect(user.status.textStatus).toEqual('Accepted');
      });
      test('Rejected', async () => {
        const user: IUser = await User.create({
          ...hackerUser,
          status: {
            applied: true,
            rejected: true,
            statusReleased: true,
          },
        });

        expect(user.status.textStatus).toEqual('Rejected');
      });
      test('Waitlisted', async () => {
        const user: IUser = await User.create({
          ...hackerUser,
          status: {
            applied: true,
            waitlisted: true,
            statusReleased: true,
          },
        });

        expect(user.status.textStatus).toEqual('Waitlisted');
      });
    });
    describe('Status Not Released', () => {
      test('Accepted', async () => {
        const user: IUser = await User.create({
          ...hackerUser,
          status: {
            applied: true,
            accepted: true,
            statusReleased: false,
          },
        });

        expect(user.status.textStatus).toEqual('Applied');
      });
      test('Rejected', async () => {
        const user: IUser = await User.create({
          ...hackerUser,
          status: {
            applied: true,
            rejected: true,
            statusReleased: false,
          },
        });

        expect(user.status.textStatus).toEqual('Applied');
      });
      test('Waitlisted', async () => {
        const user: IUser = await User.create({
          ...hackerUser,
          status: {
            applied: true,
            waitlisted: true,
            statusReleased: false,
          },
        });

        expect(user.status.textStatus).toEqual('Applied');
      });
    });

    test('Declined', async () => {
      const user: IUser = await User.create({
        ...hackerUser,
        status: {
          applied: true,
          accepted: true,
          declined: true,
          statusReleased: true,
        },
      });

      expect(user.status.textStatus).toEqual('Declined');
    });

    test('Confirmed', async () => {
      const user: IUser = await User.create({
        ...hackerUser,
        status: {
          applied: true,
          accepted: true,
          confirmed: true,
          statusReleased: true,
        },
      });

      expect(user.status.textStatus).toEqual('Confirmed');
    });

    test('Checked In', async () => {
      const user: IUser = await User.create({
        ...hackerUser,
        status: {
          applied: true,
          accepted: true,
          confirmed: true,
          checkedIn: true,
          statusReleased: true,
        },
      });

      expect(user.status.textStatus).toEqual('Checked In');
    });

    test('Checked In and Declined', async () => {
      const user: IUser = await User.create({
        ...hackerUser,
        status: {
          applied: true,
          accepted: true,
          confirmed: true,
          checkedIn: true,
          declined: true,
          statusReleased: true,
        },
      });

      expect(user.status.textStatus).toEqual('Declined');
    });
  });
  describe('Internal Text Status', () => {
    test('Not applied', async () => {
      const user: IUser = await User.create({
        ...hackerUser,
      });

      expect(user.status.internalTextStatus).toEqual('Not Applied');
    });

    test('Applied', async () => {
      const user: IUser = await User.create({
        ...hackerUser,
        status: {
          applied: true,
        },
      });

      expect(user.status.internalTextStatus).toEqual('Applied');
    });

    describe('Status Released', () => {
      test('Accepted', async () => {
        const user: IUser = await User.create({
          ...hackerUser,
          status: {
            applied: true,
            accepted: true,
            statusReleased: true,
          },
        });

        expect(user.status.internalTextStatus).toEqual('Accepted');
      });
      test('Rejected', async () => {
        const user: IUser = await User.create({
          ...hackerUser,
          status: {
            applied: true,
            rejected: true,
            statusReleased: true,
          },
        });

        expect(user.status.internalTextStatus).toEqual('Rejected');
      });
      test('Waitlisted', async () => {
        const user: IUser = await User.create({
          ...hackerUser,
          status: {
            applied: true,
            waitlisted: true,
            statusReleased: true,
          },
        });

        expect(user.status.internalTextStatus).toEqual('Waitlisted');
      });
    });
    describe('Status Not Released', () => {
      test('Accepted', async () => {
        const user: IUser = await User.create({
          ...hackerUser,
          status: {
            applied: true,
            accepted: true,
            statusReleased: false,
          },
        });

        expect(user.status.internalTextStatus).toEqual('Accepted');
      });
      test('Rejected', async () => {
        const user: IUser = await User.create({
          ...hackerUser,
          status: {
            applied: true,
            rejected: true,
            statusReleased: false,
          },
        });

        expect(user.status.internalTextStatus).toEqual('Rejected');
      });
      test('Waitlisted', async () => {
        const user: IUser = await User.create({
          ...hackerUser,
          status: {
            applied: true,
            waitlisted: true,
            statusReleased: false,
          },
        });

        expect(user.status.internalTextStatus).toEqual('Waitlisted');
      });
    });

    test('Declined', async () => {
      const user: IUser = await User.create({
        ...hackerUser,
        status: {
          applied: true,
          accepted: true,
          declined: true,
          statusReleased: true,
        },
      });

      expect(user.status.internalTextStatus).toEqual('Declined');
    });

    test('Confirmed', async () => {
      const user: IUser = await User.create({
        ...hackerUser,
        status: {
          applied: true,
          accepted: true,
          confirmed: true,
          statusReleased: true,
        },
      });

      expect(user.status.internalTextStatus).toEqual('Confirmed');
    });

    test('Checked In', async () => {
      const user: IUser = await User.create({
        ...hackerUser,
        status: {
          applied: true,
          accepted: true,
          confirmed: true,
          checkedIn: true,
          statusReleased: true,
        },
      });

      expect(user.status.internalTextStatus).toEqual('Checked In');
    });

    test('Checked In and Declined', async () => {
      const user: IUser = await User.create({
        ...hackerUser,
        status: {
          applied: true,
          accepted: true,
          confirmed: true,
          checkedIn: true,
          declined: true,
          statusReleased: true,
        },
      });

      expect(user.status.internalTextStatus).toEqual('Declined');
    });
  });

  describe('Computed Application Score', () => {
    test('No scores', async () => {
      const user = await User.create(hackerUser);
      expect(user.internal.computedApplicationScore).toEqual(-1);
    });

    test('Partial Scores', async () => {
      const user = await User.create({
        ...hackerUser,
        internal: {
          applicationScores: {
            shortEssay: {
              score: 100,
              reviewer: 'foobar',
            },
          },
        },
      });

      expect(user.internal.computedApplicationScore).toEqual(-1);
    });

    describe('Fully graded', () => {
      test('Perfect score', async () => {
        const user = await User.create({
          ...hackerUser,
          hackerApplication: {},
          internal: {
            applicationScores: {
              longEssay: {
                score: 4,
                reviewer: 'foobar',
              },
              shortEssay: {
                score: 4,
                reviewer: 'foobar',
              },
              portfolio: {
                score: 2,
                reviewer: 'barfoo',
              },
            },
          },
        });

        expect(user.internal.computedApplicationScore).toEqual(100);
      });

      test('Pro haxxor', async () => {
        const user = await User.create({
          ...hackerUser,
          internal: {
            applicationScores: {
              longEssay: {
                score: 1,
                reviewer: 'foobar',
              },
              shortEssay: {
                score: 1,
                reviewer: 'foobar',
              },
              portfolio: {
                score: 3,
                reviewer: 'barfoo',
              },
            },
          },
        });

        expect(user.internal.computedApplicationScore).toEqual(
          (7 / totalAvailablePoints.normal) * 100,
        );
      });

      test('Noob haxxor', async () => {
        const user = await User.create({
          ...hackerUser,
          hackerApplication: {
            hackathonsAttended: enumOptions.hackathonsAttended[0],
          },
          internal: {
            applicationScores: {
              longEssay: {
                score: 1,
                reviewer: 'foobar',
              },
              shortEssay: {
                score: 1,
                reviewer: 'foobar',
              },
            },
          },
        });

        expect(user.internal.computedApplicationScore).toEqual(
          (4 / totalAvailablePoints.first) * 100,
        );
      });

      test('Noob haxxor but they somehow also get their portfolio graded', async () => {
        const user = await User.create({
          ...hackerUser,
          hackerApplication: {
            hackathonsAttended: enumOptions.hackathonsAttended[0],
          },
          internal: {
            applicationScores: {
              longEssay: {
                score: 1,
                reviewer: 'foobar',
              },
              shortEssay: {
                score: 1,
                reviewer: 'foobar',
              },
              portfolio: {
                score: 100000,
                reviewer: 'barfoo',
              },
            },
          },
        });

        expect(user.internal.computedApplicationScore).toEqual(
          (4 / totalAvailablePoints.first) * 100,
        );
      });
    });
  });

  describe('Roles', () => {
    test('Admin', async () => {
      const user = await User.create({
        ...hackerUser,
        groups: {
          admin: true,
        },
      });

      expect(user.toJSON().roles).toEqual({
        admin: true,
        organizer: true,
        volunteer: true,
        hacker: true,
      });
    });
    test('Organizer', async () => {
      const user = await User.create({
        ...hackerUser,
        groups: {
          organizer: true,
        },
      });

      expect(user.toJSON().roles).toEqual({
        admin: false,
        organizer: true,
        volunteer: true,
        hacker: false,
      });
    });
    test('Volunteer', async () => {
      const user = await User.create({
        ...hackerUser,
        groups: {
          volunteer: true,
        },
      });

      expect(user.toJSON().roles).toEqual({
        admin: false,
        organizer: false,
        volunteer: true,
        hacker: false,
      });
    });
    test('Hacker', async () => {
      const user = await User.create({
        ...hackerUser,
        groups: {
          hacker: true,
        },
      });

      expect(user.toJSON().roles).toEqual({
        admin: false,
        organizer: false,
        volunteer: false,
        hacker: true,
      });
    });
  });

  test('Full Name', async () => {
    const user = await User.create({
      ...hackerUser,
      firstName: 'Bill',
      lastName: 'Gates',
    });

    expect(user.toJSON().fullName).toEqual('Bill Gates');
  });
});
