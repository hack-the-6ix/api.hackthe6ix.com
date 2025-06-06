import { IUser } from '../../models/user/fields';
import { MailingList } from '../../types/mailer';
import { addSubscriptionsRequest } from './util/listmonk';
import { getList } from './util/db';
import DynamicCacheProvider from "../cache";

const mailingListCache = new DynamicCacheProvider(async (list: string) => {
  return await getList(list)
}, {
  stdTTL: 60
});

/**
 * This will add a user to every registered mailing list with the (expected)
 * name of the mailing list in their email.
 *
 * This can be used to verify that the correct list ID was used; however,
 * it does NOT verify that the query is correct.
 *
 * The request user's mail merge will be used for all of the test users.
 */
export default async (requestUser: IUser, subscriberID: number) => {
  const listNames: string[] = [];

  for (const list in MailingList) {
    const listConfig = await mailingListCache.get(list);

    await addSubscriptionsRequest(
      listConfig.listID,
      [subscriberID],
    );

    listNames.push(list);
  }

  return listNames;
};
