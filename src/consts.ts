import { ObjectId } from 'bson';
import { IUser } from './models/user/fields';

export const port = process.env.PORT || 6971;
export const database =
  process.env.DATABASE || 'mongodb://localhost:27017/ht6backend';
export const systemUser = {
  _id: new ObjectId('000000000000000000000000'),
  firstName: 'System',
  lastName: 'System',
  idpLinkID: 'system',
  email: 'system',
  groups: {
    admin: true,
  },
  roles: {
    admin: true,
    organizer: true,
    volunteer: true,
    hacker: true,
  },
} as IUser;

export const totalAvailablePoints = {
  normal: 19,
  first: 13,
};

export const deadlinesOverrides = (
  process.env.EMAILS_CAN_ALWAYS_APPLY
    ? process.env.EMAILS_CAN_ALWAYS_APPLY.split(',')
    : []
)
  .filter((rule) => rule.length > 0)
  .map((rule) => rule.toLowerCase());
export const LAST_SECOND_OF_CENTURY = 4102444799000;
