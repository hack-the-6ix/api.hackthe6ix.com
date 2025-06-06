import { InternalServerError } from '../../types/errors';
import { sendEmailRequest } from './util/listmonk';

/**
 * Sends a singular email using the Listmonk transaction API
 *
 * @param subscriberID - Listmonk subscriber ID
 * @param templateID - Listmonk template ID
 * @param additional_data - Additional data to be substituted into the email
 */
export default async (subscriberID: number, templateID: number, additional_data?: { [key: string]: string }) => {

  const result = await sendEmailRequest(subscriberID, templateID, additional_data); 

  if (result.status != 200 || !result.data) {
    throw new InternalServerError('Unable to send email');
  }

  return 'Success';
};
