import User from '../models/user/User';

let statistics: IStatistics;

export const statisticsLifetime = 1000 * 60 * 60; // stats live for 60 minutes

export const getStatistics = async (update?: boolean): Promise<IStatistics> => {
  if (!statistics || (new Date().getTime() - statistics.timestamp) > statisticsLifetime || update) {
    // The cache is too old, or the user explicitly asked for an update

    statistics = {
      timestamp: new Date().getTime(),

      total: 0,

      hacker: {
        status: {
          applied: 0,
          accepted: 0,
          rejected: 0,
          waitlisted: 0,
          confirmed: 0,
          declined: 0,
          checkedIn: 0,
          rsvpExpired: 0,
          statusReleased: 0,
        },
        submittedApplicationStats: {
          gender: {
            male: 0,
            female: 0,
            other: 0,
            nonBinary: 0,
            chooseNotToSay: 0,
          },
          review: {
            reviewed: 0,
            notReviewed: 0,
            applicationScores: {
              creativeResponse: 0,
              whyHT6: 0,
              elphantQuestion: 0,
              portfolio: 0,
            },
            reviewers: {},
          },
        },
        questionBreakdown: {},
      },
      groups: {
        hacker: 0,
        admin: 0,
        organizer: 0,
        volunteer: 0,
      },
      summary: {},
      gradeDistribution: {
        overall: {},
      },
    };

    const users = await User.find({});

    // Write a summary statistic entry
    const addSummaryDate = (date: string, category: string) => {
      if (!statistics.summary[date]) {
        statistics.summary[date] = {};
      }

      if (!statistics.summary[date][category]) {
        statistics.summary[date][category] = {
          dailyChange: 0,
          cumulative: 0,
        };
      }

      statistics.summary[date][category].dailyChange++;
    };

    const generateDate = (date: Date) => {

      let month = (date.getMonth() + 1).toString();

      if (month.length < 2) {
        month = `0${month}`;
      }

      let day = date.getDate().toString();

      if (day.length < 2) {
        day = `0${day}`;
      }

      return `${month}-${day}`;

    };

    for (const rawUser of users) {
      const user = rawUser.toJSON();
      statistics.total++;

      // Summary statistics
      if (user?.groups?.hacker) {
        const created = new Date(user.created);
        const createdStr = generateDate(created);
        addSummaryDate(createdStr, 'created');

        if (user?.status?.applied && user?.hackerApplication?.lastUpdated) {
          const lastUpdated = new Date(user?.hackerApplication?.lastUpdated);
          const lastUpdatedStr = generateDate(lastUpdated);
          addSummaryDate(lastUpdatedStr, 'submitted');
        }
      }

      // Statistics for each question
      for (const question in user.hackerApplication) {
        if ((user.hackerApplication as any)[question]) {
          if (statistics.hacker.questionBreakdown[question] === undefined) {
            statistics.hacker.questionBreakdown[question] = 1;
          } else {
            statistics.hacker.questionBreakdown[question]++;
          }
        }
      }

      // Update status
      for (const s of Object.keys(user.status)) {
        // We won't include expired invitations in the accepted statistics
        if ((user.status as any)[s] && !(s === 'accepted' && user.status.rsvpExpired)) {
          (statistics.hacker.status as any)[s]++;
        }
      }

      if (user?.status?.applied) {
        // Gender
        switch (user?.hackerApplication?.gender) {
          case 'Male':
            statistics.hacker.submittedApplicationStats.gender.male++;
            break;
          case 'Female':
            statistics.hacker.submittedApplicationStats.gender.female++;
            break;
          case 'Non-Binary':
            statistics.hacker.submittedApplicationStats.gender.nonBinary++;
            break;
          case 'Prefer not to say':
            statistics.hacker.submittedApplicationStats.gender.chooseNotToSay++;
            break;
          default:
            statistics.hacker.submittedApplicationStats.gender.other++;
            break;
        }

        // Review state
        if (user?.internal?.computedApplicationScore >= 0) {
          statistics.hacker.submittedApplicationStats.review.reviewed++;
        } else {
          statistics.hacker.submittedApplicationStats.review.notReviewed++;
        }

        // Individual questions
        if (user?.internal?.applicationScores?.longEssay?.score >= 0) {
          statistics.hacker.submittedApplicationStats.review.applicationScores
            .creativeResponse++;
        }
        if (user?.internal?.applicationScores?.shortEssay?.score >= 0) {
          statistics.hacker.submittedApplicationStats.review.applicationScores.whyHT6++;
        }
        if (user?.internal?.applicationScores?.oneSentenceEssay?.score >= 0) {
          statistics.hacker.submittedApplicationStats.review.applicationScores
            .elphantQuestion++;
        }
        if (user?.internal?.applicationScores?.portfolio?.score >= 0) {
          statistics.hacker.submittedApplicationStats.review.applicationScores.portfolio++;
        }

        const scores: any = user?.internal?.applicationScores || {};

        for (const question in scores) {
          const reviewerID = scores[question]?.reviewer;
          const score = scores[question]?.score;

          if (reviewerID) {

            if (!statistics.hacker.submittedApplicationStats.review.reviewers[reviewerID]) {

              let name;
              try {
                name = (await User.findOne({ _id: reviewerID }))?.fullName || 'Unknown';
              } catch (e) {
                name = 'Unknown';
              }

              statistics.hacker.submittedApplicationStats.review.reviewers[reviewerID] = {
                total: 0,
                name: name,
              };
            }
            statistics.hacker.submittedApplicationStats.review.reviewers[reviewerID].total++;
          }

          // Compute grade distribution
          if (statistics.gradeDistribution[question] === undefined) {
            statistics.gradeDistribution[question] = {};
          }
          if (!statistics.gradeDistribution[question][score]) {
            statistics.gradeDistribution[question][score] = 0;
          }
          statistics.gradeDistribution[question][score]++;
        }

        // Overall score
        const computedApplicationScore = Math.round(user?.internal?.computedApplicationScore);
        if (statistics.gradeDistribution.overall[computedApplicationScore] === undefined) {
          statistics.gradeDistribution.overall[computedApplicationScore] = 0;
        }
        statistics.gradeDistribution.overall[computedApplicationScore]++;
      }

      // Roles
      for (const r of Object.keys(user.groups)) {
        if ((user.groups as any)[r]) {
          (statistics.groups as any)[r]++;
        }
      }

      // RSVP Form
    }

    // Compute cumulative statistics
    const cumulativeRecords: any = {};

    for (const date of Object.keys(statistics.summary).sort()) {
      for (const category in statistics.summary[date]) {

        if (!cumulativeRecords[category]) {
          cumulativeRecords[category] = 0;
        }

        cumulativeRecords[category] += statistics.summary[date][category].dailyChange;

        statistics.summary[date][category].cumulative = cumulativeRecords[category];
      }
    }
  }

  return statistics;
};

export type IStatistics = {
  timestamp: number,
  total: number,
  hacker: {
    status: {
      applied: number,
      accepted: number,
      rejected: number,
      waitlisted: number,
      confirmed: number,
      declined: number,
      checkedIn: number,
      rsvpExpired: number,
      statusReleased: number
    },
    submittedApplicationStats: {
      gender: {
        male: number,
        female: number,
        nonBinary: number,
        other: number,
        chooseNotToSay: number
      },
      review: {
        reviewed: number,
        notReviewed: number,
        applicationScores: {
          creativeResponse: number,
          whyHT6: number,
          elphantQuestion: number,
          portfolio: number
        },
        reviewers: any
      },
    },
    questionBreakdown: any
  },
  groups: {
    hacker: number,
    admin: number,
    organizer: number,
    volunteer: number
  },
  summary: {
    [date: string]: {
      [category: string]: {
        dailyChange: number,
        cumulative: number
      }
    }
  },
  gradeDistribution: {
    [question: string]: {
      [score: number]: number
    }
  }
}
