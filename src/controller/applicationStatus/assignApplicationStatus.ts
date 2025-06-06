import { IUser } from '../../models/user/fields';
import User from '../../models/user/User';
import { isRSVPExpired, isRSVPOpen } from '../../models/validator';
import syncMailingLists from '../../services/mailer/syncMailingLists';
import { BadRequestError } from '../../types/errors';
import { fetchUniverseState } from '../util/resources';
import updateObject from '../util/update-object';
import getRanks from './getRanks';

/**
 * Runs the grading algorithm to assign admission states
 *
 * NOTE: Once people are marked "accepted", their spot cannot be revoked (at least not easily), so
 *       be very careful running this!
 *
 * @param legit - when true, we write the changes to disk
 * @param waitlistOver - when true, reject all waitlisted users
 * @param rawAcceptedFromWaitlistRSVPDeadline - if specified, all waitlisted users who are now accepted will have until this date to RSVP
 */
export default async (legit?: boolean, waitlistOver?: boolean, rawAcceptedFromWaitlistRSVPDeadline?: any) => {

  let acceptedFromWaitlistRSVPDeadline: number | undefined = undefined;

  if (rawAcceptedFromWaitlistRSVPDeadline) {
    acceptedFromWaitlistRSVPDeadline = parseInt(rawAcceptedFromWaitlistRSVPDeadline);

    if (isNaN(acceptedFromWaitlistRSVPDeadline)) {
      throw new BadRequestError('Waitlist deadline is NaN!');
    }
  }

  const universeState = await fetchUniverseState();

  // A user is in a "dead state" if this predicate is false
  const userEligible = (user: IUser) =>
    !isRSVPExpired(user) &&
    (!user?.status?.accepted || isRSVPOpen(user) || user?.status?.waitlisted || user?.status?.confirmed) && // Users who have confirmed, can confirm, or haven't been assigned a state can still potentially attend
    !user?.status?.rejected && !user?.status?.declined; // If a user is rejected or declined, they're out

  const rawRankedUsers = await getRanks();

  const rankedUsers = rawRankedUsers.filter(userEligible);

  // Although being rejected technically puts a user in a "dead state", we will classify it separately to be consistent
  const dead: IUser[] = rawRankedUsers.filter((user: IUser) => !userEligible(user) && !user?.status?.rejected);
  const rejected: IUser[] = rawRankedUsers.filter((user: IUser) => user?.status?.rejected);

  const accepted: IUser[] = [];
  const waitlisted: IUser[] = [];

  let budgetAccepted = universeState.private.maxAccepted;
  let budgetWaitlisted = universeState.private.maxWaitlist;

  // First pass is to check how many slots we have left to allocate
  for (const user of rankedUsers) {
    if (user.status.accepted) {
      budgetAccepted--;
    }
    if (user.status.waitlisted) {
      budgetWaitlisted--;
    }
  }

  const acceptUser = async (user: IUser, personalDeadline?: number) => {
    const update: any = {
      'status.accepted': true,
      'status.waitlisted': false,
    };

    if (personalDeadline !== undefined) {
      update['personalRSVPDeadline'] = personalDeadline;
    }

    // Write changes to database
    if (legit) {
      await User.findOneAndUpdate({
        _id: user._id,
      }, update);
    }

    // Update budgets
    if (user.status.waitlisted) {
      budgetWaitlisted++;
    }
    budgetAccepted--;

    // Update return user
    updateObject(user, {
      ...update,
      'status.internalTextStatus': 'Accepted',
    });

    accepted.push(user);
  };
  const rejectUser = async (user: IUser) => {
    const update = {
      'status.rejected': true,
      'status.waitlisted': false,
    };

    // Write changes to database
    if (legit) {
      await User.findOneAndUpdate({
        _id: user._id,
      }, update);
    }

    // Update budgets
    if (user.status.waitlisted) {
      budgetWaitlisted++;
    }

    // Update return user
    updateObject(user, {
      ...update,
      'status.internalTextStatus': 'Rejected',
    });


    rejected.push(user);
  };
  const waitlistUser = async (user: IUser) => {
    const update = {
      'status.waitlisted': true,
    };

    // Write changes to database
    if (legit) {
      await User.findOneAndUpdate({
        _id: user._id,
      }, update);
    }

    // Update budgets
    budgetWaitlisted--;

    // Update return user
    updateObject(user, {
      ...update,
      'status.internalTextStatus': 'Waitlisted',
    });


    waitlisted.push(user);
  };

  // Now, we will do a second pass and accept + waitlist as many people as we can
  // At this point, all the users should either be eligible to confirm (we'll leave them alone),
  // confirmed (we'll leave them alone), waitlisted (we'll try to admit them if possible), or
  // not assigned a score (we'll try to give them a state).
  for (const user of rankedUsers) {
    // We don't watch to touch people who are currently accepted or confirmed
    if (!user.status.accepted && !user.status.confirmed) {
      if (user.status.waitlisted) {
        // Try to move people from waitlisted -> accepted

        if (budgetAccepted > 0) {
          await acceptUser(user, acceptedFromWaitlistRSVPDeadline === undefined ? universeState.public.globalWaitlistAcceptedConfirmationDeadline : acceptedFromWaitlistRSVPDeadline);
        } else if (waitlistOver) {
          // Reject any waitlisted users
          await rejectUser(user);
        } else {
          waitlisted.push(user);
        }

      } else {
        // This user has not been assigned a state
        // Try to accept or waitlist people who haven't been assigned a state

        if (budgetAccepted > 0) {
          await acceptUser(user);
        } else if (budgetWaitlisted > 0 && !waitlistOver) {
          await waitlistUser(user);
        } else {
          await rejectUser(user);
        }
      }
    } else {
      accepted.push(user);
    }
  }

  
  await syncMailingLists();
  
  return { dead, accepted, rejected, waitlisted };
};
