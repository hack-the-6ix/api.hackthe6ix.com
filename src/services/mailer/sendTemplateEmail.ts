import { MailTemplate } from '../../types/mailer';
import sendEmail from './sendEmail';
import { getTemplate } from './util/db';

/**
 * Sends a singular email using the Listmonk transaction API. We use a user friendly template name to lookup the templateID.
 *
 * @param subscriberID - Listmonk subscriber ID
 * @param templateName - internal template name of the email (we use this to fetch the templateID and subject)
 * @param additional_data - Additional data to be substituted into the email
 */
export default async (subscriberID: number, templateName: MailTemplate, additional_data?: { [key: string]: string }) => {
  const template = await getTemplate(templateName);

  const templateID = template.templateID;

  await sendEmail(subscriberID, templateID, additional_data);

  return 'Success';
};
