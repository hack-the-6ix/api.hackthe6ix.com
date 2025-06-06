import { IUser } from '../../models/user/fields';
import { MailTemplate } from '../../types/mailer';
import sendTemplateEmail from './sendTemplateEmail';

/**
 * Send all available email templates to the requesting Admin user to verify
 * the integrity of the templates.
 *
 * @param requestUser
 */
export default async (subscriberID: number, additional_data?: { [key: string]: string }) => {
  const templateNames: string[] = [];

  for (const template in MailTemplate) {
    templateNames.push(template);
    await sendTemplateEmail(
      subscriberID,
      (MailTemplate as any)[template],
      additional_data,
    );
  }

  return templateNames;
};
