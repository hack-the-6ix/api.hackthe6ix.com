import { IUser } from '../../models/user/fields';
import User from '../../models/user/User';
import { MailingList } from '../../types/mailer';
import syncMailingList from './syncMailingList';
import { getList } from './util/db';
import DynamicCacheProvider from "../cache";
import userInList from './util/user_in_list';
const mailingListCache = new DynamicCacheProvider(async (list: string) => {
  return await getList(list)
}, {
  stdTTL: 60
});

/**
 * Given a MailingList name, search for the relevant users that should be in the list and
 * sync with Listmonk.
 *
 * If mailingList is not provided, sync all lists in the system.
 *
 * @param inputMailingLists - list of mailing list names
 */


export default async (inputMailingLists?: string[]) => {
  let mailingLists: string[] = [];

  if (inputMailingLists) {
    mailingLists = [...inputMailingLists];
  } else {
    for (const list in MailingList) {
      mailingLists.push(list);
    }
  }

  for (const list of mailingLists) {
    const listConfig = await mailingListCache.get(list);

    const query = {
      ...listConfig?.query || {},
    };

    const filterQuery = {
      ...listConfig?.filterQuery || {},
    };


    const subscriberIDs: number[] = (await User.find(query))
    .filter((u: IUser) => u.mailingListSubcriberID !== undefined)
    .filter(u => userInList(u, filterQuery))
    .map((u: IUser) => u.mailingListSubcriberID!);
    

    await syncMailingList(
      listConfig?.listID!,
      subscriberIDs
    );
  }

  return mailingLists;
};
