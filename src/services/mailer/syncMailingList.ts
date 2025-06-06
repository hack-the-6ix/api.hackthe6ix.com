import User from '../../models/user/User';
import { InternalServerError } from '../../types/errors';
import {
  addSubscriptionsRequest,
  deleteSubscriptionsRequest,
  getMailingListSubscriptionsRequest,
} from './util/listmonk';

/**
 * Syncs mailing list with list of subscriber IDs that should be enrolled at this instant
 *
 * @param mailingListID
 * @param subscriberIDs - array of subscriber IDs that should be in the mailing list. All others are removed.
 */
export default async (mailingListID: string, subscriberIDs: number[]) => {
  // Step 1: Fetch a list of the current subscribers from the relevant mailing list
  const currentSubscribers = await getMailingListSubscriptionsRequest(mailingListID);

  const currentSubscribersSet = new Set(currentSubscribers);
  const targetSubscribersSet = new Set(subscriberIDs);

  // Step 2: Add users that aren't on the list yet that should be
  const toBeAdded = subscriberIDs.filter((id: number) => !currentSubscribersSet.has(id));

  // Step 3: Delete users that are on the list that shouldn't be
  const toBeDeleted = currentSubscribers.filter((id: number) => !targetSubscribersSet.has(id));

  // Step 4: Submit the new list of subscriber IDs
  await addSubscriptionsRequest(mailingListID, toBeAdded);
  await deleteSubscriptionsRequest(mailingListID, toBeDeleted);

  // Step 5: Verify sync was successful by fetching all subscribers
  const finalSubscribers = await getMailingListSubscriptionsRequest(mailingListID);

  if (finalSubscribers.length !== subscriberIDs.length) {
    // A simple length check
    throw new InternalServerError('Mailing list sync failed: final count mismatch.');
  }

  const finalSubscribersSet = new Set(finalSubscribers);
  for (const id of subscriberIDs) {
    if (!finalSubscribersSet.has(id)) {
      throw new InternalServerError(`Mailing list sync failed: subscriber ${id} not found in final list.`);
    }
  }

  // Return the subscriber IDs that were added and deleted
  return { added: toBeAdded, deleted: toBeDeleted };
};
