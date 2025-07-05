import mongoose from 'mongoose';
import User from '../../models/user/User';
import { getStatistics, statisticsLifetime } from '../../services/statistics';
import {
  hackerUser,
  mockDate,
  organizerUser,
  runAfterAll,
  runAfterEach,
  runBeforeAll,
  runBeforeEach,
} from '../test-utils';
import { totalAvailablePoints } from '../../consts';

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

jest.mock('../../controller/util/resources', () => ({
  ...jest.requireActual('../../controller/util/resources'),
  getModels: jest.fn(),
}));

const generateMockusersA = async () => {
  await User.create({
    ...hackerUser,
    _id: new mongoose.Types.ObjectId(),
    status: {
      applied: true,
    },
  });

  await User.create({
    ...hackerUser,
    _id: new mongoose.Types.ObjectId(),
    status: {
      accepted: true,
    },
  });
};

const generateMockusersB = async () => {
  await User.create({
    ...hackerUser,
    _id: new mongoose.Types.ObjectId(),
    status: {
      applied: true,
    },
  });

  await User.create({
    ...hackerUser,
    _id: new mongoose.Types.ObjectId(),
    status: {
      applied: true,
    },
  });
};

/**
 * Format of cases:
 * cases = [
 *  {...}, # x1
 *  {...}, # x2
 *  {...}, # x3
 * ]
 *
 * n Users are generated with the (n-1)th entry in cases. (where n starts from 0)
 */
const generateUsersFromTestCase = async (cases: any[]) => {
  const promises: any[] = [];

  for (let j = 0; j < cases.length; j++) {
    const payload = cases[j] as any;

    for (let i = 0; i <= j; i++) {
      promises.push(
        User.create({
          ...hackerUser,
          _id: new mongoose.Types.ObjectId(),
          ...payload,
        }),
      );
    }
  }
  await Promise.all(promises);
};

describe('Get statistics', () => {
  describe('Cache', () => {
    test('Fetch from cache', async () => {
      // If these reads occur within 5 minutes, statisticsB should be identical
      // to statisticsA despite the data changing
      await generateMockusersA();

      let restoreDateMock = mockDate(0);
      const statisticsA = await getStatistics();
      restoreDateMock();

      // Clear db and start again
      await User.deleteMany({});
      await generateMockusersB();

      // Fast forward 4:59:99 into the future
      restoreDateMock = mockDate(statisticsLifetime - 1);
      const statisticsB = await getStatistics();
      restoreDateMock();

      expect(statisticsA).toEqual(statisticsB);
    });

    test('Cache expired', async () => {
      await generateMockusersA();

      let restoreDateMock = mockDate(0);
      const statisticsA = await getStatistics();
      restoreDateMock();

      // Clear db and start again
      await User.deleteMany({});
      await generateMockusersB();

      // Fast forward 4:59:99 into the future
      restoreDateMock = mockDate(statisticsLifetime + 1);
      const statisticsB = await getStatistics();
      restoreDateMock();

      expect(statisticsA).not.toEqual(statisticsB);
    });

    test('Force refresh', async () => {
      await generateMockusersA();

      const statisticsA = await getStatistics();

      // Clear db and start again
      await User.deleteMany({});
      await generateMockusersB();

      const statisticsB = await getStatistics(true);

      expect(statisticsA).not.toEqual(statisticsB);
    });
  });

  describe('Content', () => {
    test('Total', async () => {
      await generateMockusersA();

      const statistics = await getStatistics(true);

      expect(statistics.total).toEqual(2);
    });

    describe('Status', () => {
      test('Main status', async () => {
        // Okay yes this is a bit sketchy, but it works
        const statuses = [
          'applied',
          'accepted',
          'rejected',
          'waitlisted',
          'confirmed',
          'declined',
          'checkedIn',
        ];

        const expectedStatus: any = {
          rsvpExpired: 0,
        };
        const promises: any[] = [];

        for (let i = 0; i < statuses.length; i++) {
          const status: any = {};
          status[statuses[i]] = true;

          for (let k = 0; k < i; k++) {
            promises.push(
              User.create({
                ...hackerUser,
                _id: new mongoose.Types.ObjectId(),
                status: {
                  ...status,
                  statusReleased: true,
                },
              }),
            );
          }

          expectedStatus[statuses[i]] = i;
        }

        await Promise.all(promises);
        const statistics = await getStatistics(true);
        expect(statistics.hacker.status).toMatchObject(expectedStatus);
      });

      test('Expired users', async () => {
        await User.create({
          ...hackerUser,
          status: {
            applied: true,
            accepted: true,
            statusReleased: true,
          },
          personalRSVPDeadline: -1,
        });

        const statistics = await getStatistics(true);
        expect(statistics.hacker.status).toMatchObject({
          accepted: 0,
          rsvpExpired: 1,
        });
      });
    });

    test('Gender', async () => {
      const cases = [
        'Male',
        'Female',
        'Other',
        'Non-Binary',
        'Prefer not to say',
      ].map((x) => ({
        hackerApplication: {
          gender: x,
        },
        status: {
          applied: true,
        },
      }));

      // Make sure we only consider applied users
      cases.push({
        hackerApplication: {
          gender: 'Male',
        },
        status: {
          applied: false,
        },
      });

      await generateUsersFromTestCase(cases);
      const statistics = await getStatistics(true);
      expect(statistics.hacker.submittedApplicationStats.gender).toEqual({
        male: 1,
        female: 2,
        other: 3,
        nonBinary: 4,
        chooseNotToSay: 5,
      });
    });

    test('Grade Distribution', async () => {
      const cases = [
        {
          // Partially completed
          status: { applied: true },
          internal: {
            applicationScores: {
              longEssay: {
                score: -1,
              },
              shortEssay: {
                score: 100,
              },
            },
          },
        },
        {
          // complete
          status: { applied: true },
          internal: {
            applicationScores: {
              longEssay: {
                score: 100,
              },
              shortEssay: {
                score: 100,
              },
              portfolio: {
                score: 101,
                reviewer: 'barfoo',
              },
            },
          },
        },
        {
          // not even touched
          status: { applied: true },
          internal: {
            applicationScores: {
              longEssay: {
                score: -1,
              },
              shortEssay: {
                score: -1,
              },
            },
          },
        },
      ];

      await generateUsersFromTestCase(cases);
      const statistics = await getStatistics(true);

      expect(statistics.gradeDistribution).toEqual({
        longEssay: {
          100: 2,
          '-1': 4,
        },
        shortEssay: {
          100: 3,
          '-1': 3,
        },
        portfolio: {
          '-1': 4,
          101: 2,
        },
        overall: {
          '-1': 4,
          [Math.round((402 / totalAvailablePoints.normal) * 100)]: 2,
        },
      });
    });
    test('Summary Statistics', async () => {
      const [DAY1, DAY2, DAY3] = [18000000, 104400000, 190800000];

      const cases = [
        {
          hackerApplication: {
            lastUpdated: DAY1,
          },
          status: {
            applied: true,
          },
          created: DAY1,
        },
        {
          hackerApplication: {
            lastUpdated: DAY3,
          },
          status: {
            applied: true,
          },
          created: DAY2,
        },
        {
          hackerApplication: {},
          status: {
            applied: false,
            lastUpdated: DAY3,
          },
          created: DAY3,
        },
      ];

      await generateUsersFromTestCase(cases);
      const statistics = await getStatistics(true);
      expect(statistics.summary).toEqual({
        '01-01': {
          created: {
            cumulative: 1,
            dailyChange: 1,
          },
          submitted: {
            cumulative: 1,
            dailyChange: 1,
          },
        },
        '01-02': {
          created: {
            cumulative: 3,
            dailyChange: 2,
          },
        },
        '01-03': {
          created: {
            cumulative: 6,
            dailyChange: 3,
          },
          submitted: {
            cumulative: 3,
            dailyChange: 2,
          },
        },
      });
    });
    test('Question Breakdown', async () => {
      const cases = [
        {
          hackerApplication: {
            githubLink: 'asdasiojasoidjsa',
          },
          status: {
            applied: false,
          },
        },
        {
          hackerApplication: {
            githubLink: 'asdasiojasoidjsa',
            linkedinLink: 'asdasda',
          },
          status: {
            applied: true,
          },
        },
        {
          hackerApplication: {},
          status: {
            applied: true,
          },
        },
      ];

      await generateUsersFromTestCase(cases);
      const statistics = await getStatistics(true);
      expect(statistics.hacker.questionBreakdown).toEqual({
        githubLink: 3,
        linkedinLink: 2,
      });
    });

    test('Groups', async () => {
      const cases = ['hacker', 'admin', 'organizer', 'volunteer'].map((x) => {
        const c: any = {
          groups: {},
        };

        c.groups[x] = true;

        return c;
      });

      await generateUsersFromTestCase(cases);
      const statistics = await getStatistics(true);
      expect(statistics.groups).toEqual({
        hacker: 1,
        admin: 2,
        organizer: 3,
        volunteer: 4,
      });
    });

    test('Review', async () => {
      const organizer = await User.create(organizerUser);

      const cases = [
        {
          // Partially completed
          status: { applied: true },
          internal: {
            applicationScores: {
              shortEssay: {
                score: 100,
                reviewer: organizer._id,
              },
            },
          },
        },
        {
          // complete
          status: { applied: true },
          internal: {
            applicationScores: {
              longEssay: {
                score: 100,
                reviewer: organizer._id,
              },
              shortEssay: {
                score: 100,
                reviewer: organizer._id,
              },
              portfolio: {
                score: 101,
                reviewer: 'barfoo',
              },
            },
          },
        },
        {
          // not even touched
          status: { applied: true },
          internal: {
            applicationScores: {
              longEssay: {
                score: -1,
                reviewer: organizer._id,
              },
              shortEssay: {
                score: -1,
                reviewer: organizer._id,
              },
            },
          },
        },
      ];

      await generateUsersFromTestCase(cases);
      const statistics = await getStatistics(true);

      const expectedReviewStats: any = {
        reviewed: 2,
        notReviewed: 4,
        applicationScores: {
          portfolio: 2,
          longEssay: 2,
          shortEssay: 3,
        },
        reviewers: {
          barfoo: {
            name: 'Unknown',
            total: 5,
          },
        },
      };
      expectedReviewStats.reviewers[organizer._id] = {
        name: organizer.fullName,
        total: 11,
      };

      expect(statistics.hacker.submittedApplicationStats.review).toEqual(
        expectedReviewStats,
      );
    });
  });
});
