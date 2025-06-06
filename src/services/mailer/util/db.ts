import { IMailerList } from '../../../models/mailerlist/fields';
import MailerList from '../../../models/mailerlist/MailerList';
import { IMailerTemplate } from '../../../models/mailertemplate/fields';
import MailerTemplate from '../../../models/mailertemplate/MailerTemplate';
import { NotFoundError } from '../../../types/errors';


export const getList = async (listName: string): Promise<IMailerList> => {
    const list = await MailerList.findOne({
        name: listName
    });

    if (list) {
        return list;
    } else {
        throw new NotFoundError(`Unable to fetch list with name: ${list}`);
    }
};// TODO: Update all usages of getTemplate and getList to use async version!

export const getTemplate = async (templateName: string): Promise<IMailerTemplate> => {
    const template = await MailerTemplate.findOne({
        name: templateName
    });

    if (template) {
        return template;
    } else {
        throw new NotFoundError(`Unable to fetch template with name: ${templateName}`);
    }
};

