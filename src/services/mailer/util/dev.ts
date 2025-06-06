import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { InternalServerError } from '../../../types/errors';
import {log} from "../../logger";

const devLogPath = '../../../../dev_logs';
const subscribersPath = path.resolve(__dirname, devLogPath, 'subscribers.json');
const mailingListsPath = path.resolve(__dirname, devLogPath, 'mailing_lists');

interface MockSubscriber {
    id: number;
    uuid: string;
    created_at: string;
    updated_at: string;
    email: string;
    name: string;
    attribs: any;
    lists: number[];
    status: 'enabled' | 'disabled';
}

// Initialize dev log directory
if(process.env.NODE_ENV === 'development'){
  try {
    const absDevLogPath = path.resolve(path.join(__dirname, devLogPath));
    if (!fs.existsSync(absDevLogPath)) {
      fs.mkdirSync(absDevLogPath, {recursive: true});
    }
    if (!fs.existsSync(subscribersPath)) {
        fs.writeFileSync(subscribersPath, JSON.stringify([]));
    }
    if (!fs.existsSync(mailingListsPath)) {
        fs.mkdirSync(mailingListsPath, {recursive: true});
    }
    log.info("Successfully initialized development mailing logging.")
  }
  catch (err) {
    log.error("Unable to initialize development mailing logging.", err);
  }
}

const readSubscribers = (): MockSubscriber[] => {
    if (!fs.existsSync(subscribersPath)) return [];
    return JSON.parse(fs.readFileSync(subscribersPath, 'utf-8'));
}

const writeSubscribers = (subscribers: MockSubscriber[]) => {
    fs.writeFileSync(subscribersPath, JSON.stringify(subscribers, null, 2));
}

const getMailingListLogFileName = (mailingListID: number | string) => path.resolve(mailingListsPath, `${mailingListID}.json`);

const readMailingList = (mailingListID: number | string): number[] => {
    const fileName = getMailingListLogFileName(mailingListID);
    if (!fs.existsSync(fileName)) return [];
    return JSON.parse(fs.readFileSync(fileName, 'utf-8'));
}

const writeMailingList = (mailingListID: number | string, subscriberIDs: number[]) => {
    const fileName = getMailingListLogFileName(mailingListID);
    fs.writeFileSync(fileName, JSON.stringify(subscriberIDs, null, 2));
}

export const mockSendEmail = async (subscriberID: number, templateID: number, additional_data: any) => {
  const subscribers = readSubscribers();
  const subscriber = subscribers.find(s => s.id === subscriberID);
  const recipientEmail = subscriber ? subscriber.email : `subscriber_id_${subscriberID}`;

  const message = `[${new Date().toISOString()}] Template ${templateID} was sent to ${recipientEmail} (ID: ${subscriberID}) with data ${JSON.stringify(additional_data)}\n`;

  fs.appendFile(path.resolve(__dirname, devLogPath + '/mailer.log'), message, (err) => {
    if (err) {
      throw new InternalServerError('Unable to send mock email: ' + err.toString());
    }
  });

  return {
    status: 200,
    data: { data: true },
    statusText: 'OK',
    headers: {},
    config: {},
  };
};

export const mockGetMailingListSubscriptions = async (mailingListID: number) => {
    return readMailingList(mailingListID);
};

export const mockCreateSubscriber = async (userEmail: string, name: string) => {
    const subscribers = readSubscribers();
    const existingSubscriber = subscribers.find(s => s.email === userEmail);
    if (existingSubscriber) {
        return existingSubscriber.id;
    }
    const newId = subscribers.length > 0 ? Math.max(...subscribers.map(s => s.id)) + 1 : 1;
    const now = new Date().toISOString();
    const newSubscriber: MockSubscriber = {
        id: newId,
        uuid: randomUUID(),
        created_at: now,
        updated_at: now,
        email: userEmail,
        name: name,
        attribs: {},
        lists: [],
        status: 'enabled'
    };
    subscribers.push(newSubscriber);
    writeSubscribers(subscribers);
    return newId;
}

export const mockGetSubscriberInfo = async (subscriberID: number) => {
    const subscribers = readSubscribers();
    const subscriber = subscribers.find(s => s.id === subscriberID);
    if (!subscriber) {
        return undefined;
    }

    return {
        ...subscriber,
        lists: subscriber.lists.map(listId => ({ id: listId }))
    };
}

export const mockUpdateSubscriber = async (subscriberID: number, email: string, name:string, attributes: any, lists: number[]) => {
    const subscribers = readSubscribers();
    const subscriberIndex = subscribers.findIndex(s => s.id === subscriberID);
    if (subscriberIndex === -1) {
        throw new InternalServerError(`Unable to update mock subscriber: subscriber with ID ${subscriberID} not found`);
    }

    subscribers[subscriberIndex] = {
        ...subscribers[subscriberIndex],
        email,
        name,
        attribs: attributes,
        lists,
        updated_at: new Date().toISOString(),
    };
    writeSubscribers(subscribers);
}

export const mockAddSubscriptions = async (mailingListID: string | number, subscriberIDs: number[]) => {
    const listId = typeof mailingListID === 'string' ? parseInt(mailingListID) : mailingListID;
    
    let list = readMailingList(listId);
    subscriberIDs.forEach(id => {
        if (!list.includes(id)) {
            list.push(id);
        }
    });
    writeMailingList(listId, list);

    const subscribers = readSubscribers();
    subscriberIDs.forEach(id => {
        const subscriber = subscribers.find(s => s.id === id);
        if (subscriber && !subscriber.lists.includes(listId)) {
            subscriber.lists.push(listId);
        }
    });
    writeSubscribers(subscribers);

    return { data: true };
}

export const mockDeleteSubscriptions = async (mailingListID: string | number, subscriberIDs: number[]) => {
    const listId = typeof mailingListID === 'string' ? parseInt(mailingListID) : mailingListID;
    
    let list = readMailingList(listId);
    list = list.filter(id => !subscriberIDs.includes(id));
    writeMailingList(listId, list);

    const subscribers = readSubscribers();
    subscriberIDs.forEach(id => {
        const subscriber = subscribers.find(s => s.id === id);
        if (subscriber) {
            subscriber.lists = subscriber.lists.filter(l => l !== listId);
        }
    });
    writeSubscribers(subscribers);

    return { data: true };
}

export const mockGetSubscriberIdByEmail = async (email: string): Promise<number | null> => {
    const subscribers = readSubscribers();
    const subscriber = subscribers.find(s => s.email === email);
    return subscriber ? subscriber.id : null;
}
