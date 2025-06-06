/**
 * Abstract the actual API calls to make it easier to unit test
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import querystring from 'querystring';
import { InternalServerError } from '../../../types/errors';
import {
  mockAddSubscriptions,
  mockCreateSubscriber,
  mockDeleteSubscriptions,
  mockGetMailingListSubscriptions,
  mockGetSubscriberIdByEmail,
  mockGetSubscriberInfo,
  mockSendEmail,
  mockUpdateSubscriber,
} from './dev';


const listmonk = axios.create({
  baseURL: `${process.env.LISTMONK_API_HOST}/api`,
  auth: {
    username: process.env.LISTMONK_API_USER!,
    password: process.env.LISTMONK_API_KEY!,
  }
});

export const sendEmailRequest = async (subscriberID: number, templateID: number, additional_data: any) => {
  if (process.env.NODE_ENV === 'development') {
    return mockSendEmail(subscriberID, templateID, additional_data);
  }

  return listmonk.post(`/tx`, {
    subscriber_id: subscriberID,
    template_id: templateID,
    data: additional_data,
  })
};

export const getMailingListSubscriptionsRequest = async (mailingListID: number) => {
  if (process.env.NODE_ENV === 'development') {
    return mockGetMailingListSubscriptions(mailingListID);
  }

  const res = await listmonk.get(`/subscribers?list_id=${mailingListID}&per_page=all`);
  if (res.status !== 200) {
    throw new InternalServerError('Unable to fetch existing subscribers');
  }

  return res.data.data.results.map((entry: { id: number }) => entry.id);
};

export const createSubscriberRequest = async (userEmail: string, name: string) => {
    if (process.env.NODE_ENV === 'development') {
        return mockCreateSubscriber(userEmail, name);
    }

    const res = await listmonk.post(`/subscribers`, {
        email: userEmail,
        name: name,
        status: "enabled"
    });
    
    if (res.status !== 200) {
        throw new InternalServerError('Unable to create subscriber');
    }

    return res.data.data.id as number;  
}

export const getSubscriberInfoRequest = async (subscriberID: number) => {
    if (process.env.NODE_ENV === 'development') {
        return mockGetSubscriberInfo(subscriberID);
    }

    const res = await listmonk.get(`/subscribers/${subscriberID}`);
    if (res.status !== 200) {
        throw new InternalServerError('Unable to fetch subscriber info');
    }

    return res.data.data;
}

export const updateSubscriberRequest = async (subscriberID: number, email: string, name:string, attributes: any, lists: number[]) => {
    if (process.env.NODE_ENV === 'development') {
        await mockUpdateSubscriber(subscriberID, email, name, attributes, lists);
        return;
    }

    const updateObject: any = {
        status: "enabled",
        lists: lists,
        email: email,
        name: name,
        attribs: attributes
    };

    const res = await listmonk.put(`/subscribers/${subscriberID}`, updateObject);

    if (res.status !== 200) {
        throw new InternalServerError('Unable to update subscriber');
    }
}

export const addSubscriptionsRequest = async (mailingListID: string | number, subscriberIDs: number[]) => {
  if (process.env.NODE_ENV === 'development') {
    await mockAddSubscriptions(mailingListID, subscriberIDs);
    return;
  }

  if (typeof mailingListID === 'string') {
    mailingListID = parseInt(mailingListID);
  }

  if (subscriberIDs.length === 0) {
    return;
  }
  
  const res = await listmonk.put(`/subscribers/lists`, {
    ids: subscriberIDs,
    target_list_ids: [mailingListID],
    action: "add",
    status: "confirmed"
  });

  if (res.status !== 200) {
    throw new InternalServerError('Unable to add subscribers');
  }
}

export const deleteSubscriptionsRequest = async (mailingListID: string | number, subscriberIDs: number[]) => {
  if (process.env.NODE_ENV === 'development') {
    await mockDeleteSubscriptions(mailingListID, subscriberIDs);
    return;
  }

  if (typeof mailingListID === 'string') {
    mailingListID = parseInt(mailingListID);
  }

  if (subscriberIDs.length === 0) {
    return;
  }

  const res = await listmonk.put(`/subscribers/lists`, {
    ids: subscriberIDs,
    target_list_ids: [mailingListID],
    action: "remove",
  });

  if (res.status !== 200) {
    throw new InternalServerError('Unable to delete subscribers');
  }

}

export const getSubscriberIdByEmailRequest = async (email: string): Promise<number | null> => {
  if (process.env.NODE_ENV === 'development') {
    return mockGetSubscriberIdByEmail(email);
  }

  const escapedEmail = email.replace(/'/g, "''");
  const query = `subscribers.email = '${escapedEmail}'`;

  const res = await listmonk.get(`/subscribers`, {
    params: {
      query: query,
      per_page: 1,
    }
  });

  if (res.status !== 200) {
    throw new InternalServerError('Unable to fetch subscriber by email');
  }

  const results = res.data.data.results;
  if (results && results.length > 0) {
    return results[0].id;
  }

  return null;
}
