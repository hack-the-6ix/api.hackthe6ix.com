import { enumOptions } from './enums';
import { IUser } from './fields';
import { totalAvailablePoints } from '../../consts';

export default function (this: IUser): number {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const user = this;
  const applicationScores: typeof user.internal.applicationScores =
    user.internal.applicationScores;

  if (!applicationScores) {
    return 0;
  }

  // Calculate score in accordance to the agreed on formula
  const firstHackathon =
    user.hackerApplication?.hackathonsAttended ===
    enumOptions.hackathonsAttended[0];

  // Ensure all categories are graded before performing the calculation
  for (const category of [
    'longEssay',
    'shortEssay',
    'oneSentenceEssay',
    'portfolio',
  ] as const) {
    if (
      (category !== 'portfolio' || !firstHackathon) && // If this is the applicant's first hackathon, we waive the validation for portfolio
      applicationScores[category]?.score < 0 // Ensure we have all the relevant data on file
    ) {
      return -1;
    }
  }

  const total: number =
    applicationScores.longEssay?.score +
    applicationScores.shortEssay?.score +
    applicationScores.oneSentenceEssay?.score +
    (!firstHackathon ? applicationScores.portfolio?.score : 0);

  return (
    (total /
      (firstHackathon
        ? totalAvailablePoints.first
        : totalAvailablePoints.normal)) *
    100
  );
}
