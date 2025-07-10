import { IUser } from "../../models/user/fields";
import DynamicCacheProvider from "../cache";
import { getList } from './util/db';
import { MailingList } from '../../types/mailer';
import userInList from "./util/user_in_list";
import { createSubscriberRequest, getSubscriberIdByEmailRequest, getSubscriberInfoRequest, updateSubscriberRequest } from "./util/listmonk";
import {log} from "../../services/logger";

const mailingListCache = new DynamicCacheProvider(async (list: string) => {
    return await getList(list)
  }, {
    stdTTL: 60
  });

export default async (user: IUser) => {
    let mailingLists: string[] = [];

    for (const list in MailingList) {
        mailingLists.push(list);
    }

    const expectedLists: number[] = [];
    const allManagedListIds: number[] = [];

    for (const list of mailingLists) {
        const listConfig = await mailingListCache.get(list);
        allManagedListIds.push(listConfig.listID);

        const filterQuery = {
            ...listConfig?.query || {},
            ...listConfig?.filterQuery || {},
        };

        if (userInList(user, filterQuery)) {
            expectedLists.push(listConfig.listID);
        }
    }

    log.info(`[LISTMONK] Syncing user ${user.email} to mailing lists: ${expectedLists.join(',')}`);

    let subscriberID = user.mailingListSubcriberID;

    if (!subscriberID) {
        try {
            subscriberID = await createSubscriberRequest(user.email, user.fullName);
        } catch (e: any) {
            // If 409 (already exists), we can just get the subscriber ID
            if (e.response.status === 409) {
                // The 0 case will never happen since the subscriber already exists if we're here, for TS type checking
                subscriberID = await getSubscriberIdByEmailRequest(user.email) || 0;
            } else {
                throw e;
            }
        }
    }

    // Query listmonk for all the user's lists
    const subscriberInfo = await getSubscriberInfoRequest(subscriberID);
    const currentListIds = subscriberInfo.lists.map((l: any) => l.id);
    
    // This may contain lists that we don't manage (not in allManagedListIds), we need to ensure that we only manage the lists that we expect to manage
    const unmanagedListIds = currentListIds.filter((id: number) => !allManagedListIds.includes(id));

    // Add the non-managed lists to the user
    // Add the lists that the user should be in
    const newLists = [...new Set([...unmanagedListIds, ...expectedLists])];


    const mailmerge = { ...user.mailmerge };

    // Send a request to listmonk to update the user's lists
    await updateSubscriberRequest(subscriberID, user.email, user.fullName, mailmerge, newLists);

    return subscriberID;
}