import Team from '../../models/team/Team';
import { IUser } from '../../models/user/fields';
import User from '../../models/user/User';

interface PagnitionOptions {
  page?: number;
  size?: number;
}

/**
 * Export a list of users who have applied in descending order by grade with pagination
 *
 * @param usePersonalApplicationScore - when true, users are sorted by their individual scores,
 *                                      without any adjustment from their team
 */
export default async (usePersonalApplicationScore?: boolean, pagination?: PagnitionOptions) => {
  const sortCriteria = usePersonalApplicationScore
    ? 'computedApplicationScore'
    : 'computedFinalApplicationScore';

  const users = await Promise.all((await User.find({
    'status.applied': true,
  })).map(async (user: IUser) => {
    // We will inject the team score at this point
    // This isn't done at the user object level to prevent recursive dependencies

    const jsonUser: IUser = user.toJSON() as IUser;
    const teamCode = jsonUser?.hackerApplication?.teamCode;

    let teamScore = -1;

    if (teamCode) {
      const team = await Team.findOne({ code: teamCode });
      if(team) {
        teamScore = team.teamScore;
      }
    }

    jsonUser.internal.computedFinalApplicationScore = Math.max(
      teamScore,
      jsonUser?.internal?.computedApplicationScore === undefined
        ? -1
        : jsonUser?.internal?.computedApplicationScore,
    );

    return jsonUser;
  }));

  const sortedUsers =  users
  .sort((a: IUser, b: IUser) => {
    const diff = (b?.internal[sortCriteria] ?? -1) - (a?.internal[sortCriteria] ?? -1);

    if (diff === 0) {
      const diffPersonal = (b?.internal?.computedApplicationScore ?? -1) - (a?.internal?.computedApplicationScore ?? -1);

      if (diffPersonal === 0) {
        // If the scores are the same, the tiebreaker is whoever submitted earlier
        return a?.hackerApplication?.lastUpdated - b?.hackerApplication?.lastUpdated;
      } else {
        return diffPersonal;
      }
    } else {
      return diff;
    }
  });

  if (pagination) {
    const { page = 1, size = 10 } = pagination;
    const startIndex = (page - 1) * size;
    const endIndex = page * size;

    return {
      total: sortedUsers.length,
      users: sortedUsers.slice(startIndex, endIndex)
    };
  }
  return sortedUsers;
}
