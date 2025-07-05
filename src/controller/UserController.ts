import * as qrcode from 'qrcode';
import { enumOptions } from '../models/user/enums';
import { fields, IPartialApplication, IUser } from '../models/user/fields';
import User from '../models/user/User';
import { canRSVP, isRSVPOpen } from '../models/validator';
import sendTemplateEmail from '../services/mailer/sendTemplateEmail';
import syncMailingLists from '../services/mailer/syncMailingLists';
import { WriteCheckRequest } from '../types/checker';
import {
  BadRequestError,
  DeadlineExpiredError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  RSVPRejectedError,
  SubmissionDeniedError,
} from '../types/errors';
import { MailTemplate } from '../types/mailer';
import {
  AllUserTypes,
  BasicUser,
  DiscordSyncState,
  IRSVP,
  QRCodeGenerateBulkResponse,
  QRCodeGenerateRequest,
} from '../types/types';
import { editObject, getObject } from './ModelController';
import { testCanUpdateApplication, validateSubmission } from './util/checker';
import { fetchUniverseState, getModels } from './util/resources';
import { log } from '../services/logger';
import ExternalUser from '../models/externaluser/ExternalUser';
import {
  DiscordConnectionMetadata,
  getAccessToken,
  getDiscordTokensFromUser,
  getMetadata,
  getOAuthTokens,
  getUserData,
  pushMetadata,
} from '../services/discordApi';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { queueVerification } from './DiscordController';
import { getBlobDownloadUrl, writeBlob } from './AzureBlobStorageController';
import syncUserMailingLists from '../services/mailer/syncUserMailingLists';

export const createFederatedUser = async (
  linkID: string,
  email: string,
  firstName: string,
  lastName: string,
  groupsList: string[],
  groupsHaveIDPPrefix = true,
): Promise<IUser> => {
  const groups: any = {};

  // Update the groups this user is in in the database
  // Ensure that we set all the groups the user is not in to FALSE and not NULL
  for (const group of Object.keys(fields.FIELDS.groups.FIELDS) || []) {
    //                                              Assertion includes group with leading /
    groups[group] =
      (groupsList || []).indexOf(
        `${groupsHaveIDPPrefix ? process.env.IDP_GROUP_PREFIX : ''}${group}`,
      ) !== -1;
  }

  const userInfo = await User.findOneAndUpdate(
    {
      idpLinkID: linkID,
    },
    {
      email: email.toLowerCase(),
      firstName: firstName,
      lastName: lastName,
      groups: groups,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return userInfo;
};

/**
 * Fetch a sanitized user profile of the requester
 */
export const fetchUser = async (requestUser: IUser) => {
  const data = await getObject(requestUser, 'user', {
    filter: {
      _id: requestUser._id,
    },
    size: '1',
  });

  if (!data || data.length !== 1) {
    throw new NotFoundError('User not found');
  }

  return data[0] as IUser;
};

/**
 * Updates a user's hacker application and optionally marks it as submitted
 *
 * @param requestUser
 * @param submit
 * @param hackerApplication
 */
export const updateApplication = async (
  requestUser: IUser,
  submit: boolean,
  hackerApplication: IPartialApplication,
) => {
  const hackerApplicationFields =
    getModels()['user'].rawFields.FIELDS.hackerApplication;

  if (!hackerApplication) {
    throw new BadRequestError('Application must be truthy!');
  }

  const universeState = await fetchUniverseState();

  const writeRequest: WriteCheckRequest<any, IUser> = {
    requestUser: requestUser,
    targetObject: requestUser,
    submissionObject: {
      hackerApplication: hackerApplication,
    } as IUser,
    universeState: universeState,
    fieldValue: undefined,
  };

  // We will pass in our own writeRequest, so user can be null
  await testCanUpdateApplication(requestUser);

  // If the user intends to submit, we will verify that all required fields are correctly filled
  if (submit) {
    const invalidFields: [string, string | undefined][] = validateSubmission(
      hackerApplication,
      hackerApplicationFields,
      writeRequest,
      '',
    );

    if (invalidFields.length > 0) {
      throw new SubmissionDeniedError(
        invalidFields,
        invalidFields.map((ele) => ele[0]),
      );
    }
  }

  // We will update the fields as requested
  // NOTE: The check for whether a user is eligible to submit (i.e. if it's within the deadline, etc. is done within the write check)
  const result = await editObject(
    requestUser,
    'user',
    {
      _id: requestUser._id,
    },
    {
      hackerApplication: hackerApplication,
    },
  );

  if (
    !result ||
    result.length !== 1 ||
    result[0] != requestUser._id.toString()
  ) {
    throw new InternalServerError(
      'Unable to update application',
      JSON.stringify(result),
    );
  }

  // Lastly, if the user intends to submit we will amend their user object with the new status
  // We will directly interface with the User model since this update will be done with "admin permissions"
  const statusUpdateResult = await User.findOneAndUpdate(
    {
      _id: requestUser._id,
    },
    {
      'status.applied': !!submit,
      'hackerApplication.lastUpdated': new Date().getTime(),
    },
  );

  if (!statusUpdateResult) {
    throw new InternalServerError('Unable to update status');
  }

  if (submit) {
    await syncUserMailingLists(requestUser);
    await sendTemplateEmail(
      requestUser.mailingListSubcriberID!,
      MailTemplate.applied,
    );
  }

  return 'Success';
};

/**
 * Update resume on file. Only pdf files under 5MB will be allowed.
 *
 * @param requestUser
 * @param expressFile - express fileupload file object
 */
export const updateResume = async (requestUser: IUser, expressFile: any) => {
  if (!expressFile) {
    throw new BadRequestError('Invalid file');
  }
  await testCanUpdateApplication(requestUser);
  if (expressFile.size > 5000000) {
    throw new ForbiddenError('File exceeds 5MB');
  }
  if (expressFile.mimetype !== 'application/pdf') {
    throw new ForbiddenError('Invalid file type! Must be PDF');
  }
  const filename = `${requestUser._id}-resume.pdf`;
  await writeBlob('resumes', filename, expressFile.data);
  await User.findOneAndUpdate(
    {
      _id: requestUser._id,
    },
    {
      'hackerApplication.resumeFileName': filename,
      'hackerApplication.friendlyResumeFileName': expressFile.name,
    },
  );
  return 'Success';
};

/**
 * Update waiver on file. Only pdf files under 5MB will be allowed.
 *
 * @param requestUser
 * @param expressFile - express fileupload file object
 */
export const updateWaiver = async (requestUser: IUser, expressFile: any) => {
  if (!expressFile) {
    throw new BadRequestError('Invalid file');
  }

  if (expressFile.size > 5000000) {
    throw new ForbiddenError('File exceeds 5MB');
  }
  if (expressFile.mimetype !== 'application/pdf') {
    throw new ForbiddenError('Invalid file type! Must be PDF');
  }
  const filename = `${requestUser._id}-waiver.pdf`;
  await writeBlob('waivers', filename, expressFile.data);
  await User.findOneAndUpdate(
    {
      _id: requestUser._id,
    },
    {
      'rsvpForm.waiverFileName': filename,
      'rsvpForm.friendlyWaiverFileName': expressFile.name,
    },
  );
  return 'Success';
};

/**
 * Return a signed URL to download the user's resume
 *
 * @param requestUser
 * @returns Resume URL
 */
export const getResumeURL = async (requestUser: IUser) => {
  const user = await User.findOne({ _id: requestUser._id });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  if (!user.hackerApplication.resumeFileName) {
    throw new NotFoundError('User has no resume');
  }
  const resumeURL = await getBlobDownloadUrl(
    'resumes',
    user.hackerApplication.resumeFileName,
  );
  return resumeURL;
};

/**
 * Return a signed URL to download the user's waiver
 *
 * @param requestUser
 * @returns Waiver URL
 */
export const getWaiverURL = async (requestUser: IUser) => {
  const user = await User.findOne({ _id: requestUser._id });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  if (!user.hackerApplication.waiverFileName) {
    throw new NotFoundError('User has no waiver');
  }
  const waiverURL = await getBlobDownloadUrl(
    'waivers',
    user.hackerApplication.waiverFileName,
  );
  return waiverURL;
};

/**
 * Gets the valid enum values for the hacker application
 */
export const getEnumOptions = async () => enumOptions;

/**
 * Updates the user's RSVP state
 *
 * @param requestUser
 * @param rsvp
 */
export const rsvp = async (requestUser: IUser, rsvp: IRSVP) => {
  if (!isRSVPOpen(requestUser)) {
    throw new DeadlineExpiredError('The RSVP deadline has passed!');
  }

  if (canRSVP(requestUser)) {
    const isAttending = !!rsvp.attending;

    const user = await User.findOneAndUpdate(
      {
        _id: requestUser._id,
      },
      {
        'status.confirmed': isAttending,
        'status.declined': !isAttending,
        rsvpForm: rsvp.form,
      },
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await syncUserMailingLists(user);

    if (isAttending) {
      await sendTemplateEmail(
        requestUser.mailingListSubcriberID!,
        MailTemplate.confirmed,
      );
    } else {
      await sendTemplateEmail(
        requestUser.mailingListSubcriberID!,
        MailTemplate.declined,
      );
    }

    return 'Success';
  } else {
    throw new RSVPRejectedError();
  }
};

/**
 * Fetch a random applicant that hasn't been graded yet. Note that it is possible
 * for a candidate to be fetched by multiple reviewers simultaneously if the stars
 * align. We handle this by averaging out the scores.
 *
 * @param requestUser
 * @param category - application score category to filter by (only results matching this category
 *                   will be available). If omitted, all categories are considered.
 */
export const getCandidate = async (requestUser: IUser, category?: string) => {
  const criteria: any = { $or: [] };

  if (category) {
    const query: any = {
      'status.applied': true,
    };

    // We have an exception for the portfolio question, which is that the user must
    // not be a first time hacker
    if (category === 'portfolio') {
      query['hackerApplication.hackathonsAttended'] = {
        $ne: enumOptions.hackathonsAttended[0],
      };
    }

    query[`internal.applicationScores.${category}.score`] = -1;

    criteria['$or'].push(query);
  } else {
    // We'll review this user as long as one of their category is ungraded
    for (const c in fields.FIELDS.internal.FIELDS.applicationScores.FIELDS) {
      const query: any = {
        'status.applied': true,
      };

      query[`internal.applicationScores.${c}.score`] = -1;
      criteria['$or'].push(query);
    }
  }

  const userCount = await User.countDocuments(criteria);

  if (userCount > 0) {
    const offset = 1 + Math.floor(Math.random() * userCount);

    return (
      await getObject(requestUser, 'user', {
        filter: criteria,
        size: '1',
        page: offset.toString(),
      })
    )[0];
  } else {
    throw new NotFoundError('No applications to review');
  }
};

/**
 * Adds the reviewer's assessment of this user's application to their profile.
 *
 * @param requestUser
 * @param targetUserID
 * @param grade
 */
export const gradeCandidate = async (
  requestUser: IUser,
  targetUserID: string,
  grade: any,
) => {
  if (!targetUserID) {
    throw new BadRequestError('Invalid candidate ID');
  }

  if (!grade) {
    throw new BadRequestError('Invalid grade');
  }

  const user: IUser | null = await User.findOne({
    _id: targetUserID,
  });

  if (!user) {
    throw new NotFoundError('Candidate not found');
  }

  if (
    !user.status.applied ||
    user.status.accepted ||
    user.status.waitlisted ||
    user.status.rejected
  ) {
    throw new ForbiddenError('Candidate is not eligible to be graded');
  }

  const changes: any = {};

  for (const category in grade) {
    if (
      user.internal.applicationScores &&
      category in user.internal.applicationScores
    ) {
      const score = parseInt(grade[category]);

      if (!isNaN(score)) {
        changes[`internal.applicationScores.${category}.score`] = score;
        changes[`internal.applicationScores.${category}.reviewer`] =
          requestUser._id.toString();
      } else {
        throw new BadRequestError(
          `Could not parse score ${grade[category]} for category "${category}`,
        );
      }
    } else {
      throw new ForbiddenError(`Grading category "${category}" not found!`);
    }
  }

  await User.findOneAndUpdate(
    {
      _id: targetUserID,
    },
    changes,
  );
  return 'Success';
};

/**
 * Set application released status to true for all users who have been either waitlisted, accepted, or rejected
 */
export const releaseApplicationStatus = async () => {
  const filter = {
    'status.statusReleased': false,
    $or: [
      {
        'status.waitlisted': true,
      },
      {
        'status.accepted': true,
      },
      {
        'status.rejected': true,
      },
    ],
  };

  const usersModified = (await User.find(filter)).map((u: IUser) =>
    u._id.toString(),
  );

  await User.updateMany(filter, {
    'status.statusReleased': true,
  });

  await syncMailingLists();

  return usersModified;
};

/**
 * Retrieves a user from their Discord ID
 *
 * @param discordID
 */
export const fetchUserByDiscordID = async (
  discordID: string,
): Promise<BasicUser> => {
  if (!discordID) {
    throw new BadRequestError('No discordID given.');
  }
  let userInfo: BasicUser | null = await User.findOne({
    'discord.discordID': discordID,
  });

  if (!userInfo) {
    userInfo = await ExternalUser.findOne({
      'discord.discordID': discordID,
    });
  }

  if (!userInfo) {
    throw new NotFoundError('No user found with the given Discord ID.');
  }

  return userInfo;
};

/**
 * Generate a check in QR given a userID and userType
 *
 * @param userID
 * @param userType
 */
const createCheckInQR = (
  userID: string,
  userType: AllUserTypes,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    qrcode.toDataURL(
      JSON.stringify({
        userID: userID,
        userType: userType,
      }),
      function (err, url) {
        if (err) {
          return reject(err);
        }
        return resolve(url);
      },
    );
  });
};

/**
 * Retrieve a user's check in QR code, generating if not exists
 *
 * @param requestUser
 * @param userType
 */

export const getCheckInQR = (
  requestUser: string,
  userType: AllUserTypes,
): Promise<string> => {
  const userID = String(requestUser);

  return new Promise((resolve, reject) => {
    if (userType === 'User') {
      User.findOne(
        {
          _id: userID,
        },
        'checkInQR',
      ).then((user) => {
        if (!user) {
          return reject(
            new NotFoundError(`User with ID ${userID} does not exist!`),
          );
        }
        if (user.checkInQR) {
          return resolve(user.checkInQR);
        } else {
          // We need to generate the QR code
          createCheckInQR(userID, userType)
            .then((qrCode) => {
              User.updateOne(
                {
                  _id: userID,
                },
                {
                  checkInQR: qrCode,
                },
              )
                .then(() => {
                  return resolve(qrCode);
                })
                .catch(reject);
            })
            .catch(reject);
        }
      });
    } else if (userType === 'ExternalUser') {
      ExternalUser.findOne(
        {
          _id: userID,
        },
        'checkInQR',
      ).then((externalUser) => {
        if (!externalUser) {
          return reject(
            new NotFoundError(`ExternalUser with ID ${userID} does not exist!`),
          );
        }
        if (externalUser.checkInQR) {
          return resolve(externalUser.checkInQR);
        } else {
          // We need to generate the QR code
          createCheckInQR(userID, userType)
            .then((qrCode) => {
              ExternalUser.updateOne(
                {
                  _id: userID,
                },
                {
                  checkInQR: qrCode,
                },
              )
                .then(() => {
                  return resolve(qrCode);
                })
                .catch(reject);
            })
            .catch(reject);
        }
      });
    } else {
      return reject(new BadRequestError('Invalid user type for request.'));
    }
  });
};

/**
 * Generate a QR Code for a list of (External) Users
 *
 * @param requestUser
 * @param userList
 */
export const generateCheckInQR = async (
  requestUser: IUser,
  userList: QRCodeGenerateRequest[],
): Promise<QRCodeGenerateBulkResponse[]> => {
  const ret = [] as QRCodeGenerateBulkResponse[];

  for (const user of userList) {
    if (user.userID && user.userType) {
      try {
        ret.push({
          ...user,
          code: await getCheckInQR(user.userID, user.userType),
        });
      } catch (err) {
        throw new InternalServerError(
          `Error encountered while generating QR code for ${user.userID} and type ${user.userType}.`,
          err,
        );
      }
    }
  }

  return ret;
};

/**
 * Set a User or ExternalUser as checked in
 *
 * @param userID
 * @param userType
 * @param checkInTime
 */

export const checkIn = async (
  userID: string,
  userType: AllUserTypes,
  checkInTime = Date.now(),
): Promise<string[]> => {
  const newStatus = {
    'status.checkedIn': true,
    checkInTime: checkInTime,
  };

  if (userType === 'User') {
    const user = await User.findOneAndUpdate(
      {
        _id: userID,
        'status.confirmed': true,
      },
      newStatus,
      {
        new: true,
      },
    );

    if (!user) {
      throw new NotFoundError(
        "Unable to find RSVP'd user with given ID. Ensure they have RSVP'd and that the user ID/QR matches!",
      );
    }
    return user.checkInNotes;
  } else if (userType === 'ExternalUser') {
    const user = await ExternalUser.findOneAndUpdate(
      {
        _id: userID,
      },
      newStatus,
      {
        new: true,
      },
    );
    if (!user) {
      throw new NotFoundError(
        'Unable to find external user with given ID. Ensure that the user ID/QR matches!',
      );
    }
    return user.checkInNotes;
  }

  throw new BadRequestError('Given user type is invalid.');
};

/**
 * Updates the user's Discord linked roles
 */
export const syncRoles = async (userID: string): Promise<boolean> => {
  const user = await User.findOne({
    _id: userID,
  });

  if (!user) {
    throw new NotFoundError('Unable to find user with the given ID.');
  }

  let discordTokens = getDiscordTokensFromUser(user);

  discordTokens = await getAccessToken(userID, discordTokens);

  const userMetadata = {
    isorganizer: user.roles.organizer ? 1 : 0,
    isconfirmedhacker: user.roles.hacker && user.status.confirmed ? 1 : 0,
  } as DiscordConnectionMetadata;

  await pushMetadata(discordTokens, userMetadata);

  await User.updateOne(
    {
      _id: userID,
    },
    {
      'discord.lastSyncStatus': 'SUCCESS' as DiscordSyncState,
      'discord.lastSyncTime': Date.now(),
    },
  );

  return Object.values(userMetadata).reduce((a, b) => a + b, 0) > 0; // return true if at least one role was granted
};

/**
 * Fetches and stores a user's Discord access and refresh token given a code
 *
 * @param userID
 * @param stateString
 * @param code
 */

export const associateWithDiscord = async (
  userID: string,
  stateString: string,
  code: string,
): Promise<string> => {
  const userInfo = await User.findOne(
    {
      _id: userID,
    },
    'discord.discordID discord.accessToken discord.accessTokenExpireTime discord.refreshToken',
  );

  if (!userInfo) {
    throw new NotFoundError('Unable to find user with the given ID.');
  }

  let tokens = undefined;

  try {
    tokens = await getOAuthTokens(stateString, code);
  } catch (e) {
    if (e instanceof TokenExpiredError) {
      throw new BadRequestError('The authorization state is expired.');
    } else if (e instanceof JsonWebTokenError) {
      throw new BadRequestError('Unable to verify the state token.');
    }
    throw new InternalServerError('Unable to fetch Discord OAuth tokens.');
  }

  const userDiscordData = await getUserData(tokens);

  if (
    userInfo.discord?.discordID !== undefined &&
    userDiscordData.user.id !== userInfo.discord?.discordID
  ) {
    throw new BadRequestError(
      'The given user is already linked to a Discord account.',
    );
  }

  const otherUser = await User.findOne(
    {
      'discord.discordID': userDiscordData.user.id,
    },
    ['_id'],
  );

  if (otherUser && !userInfo._id.equals(otherUser?._id)) {
    throw new BadRequestError(
      'The given Discord user is already linked to a user.',
    );
  }

  const nowTimestamp = Date.now();

  const newUser = await User.findOneAndUpdate(
    {
      _id: userID,
    },
    {
      discord: {
        discordID: userDiscordData.user.id,
        username:
          userDiscordData.user.username +
          (userDiscordData.user.discriminator === '0'
            ? ''
            : userDiscordData.user.discriminator),
        accessToken: tokens.access_token,
        accessTokenExpireTime: tokens.expires_at,
        refreshToken: tokens.refresh_token,
        lastSyncStatus: 'SOFTFAIL' as DiscordSyncState,
        lastSyncTime: nowTimestamp,
        ...(userInfo.discord?.refreshToken !== undefined
          ? {}
          : {
              verifyTime: nowTimestamp,
            }),
      },
    },
    {
      new: true,
    },
  );

  if (!newUser) {
    throw new InternalServerError(
      'Unable to update user that was associated with a Discord account.',
    );
  }

  let hasRoles = false;

  try {
    hasRoles = await syncRoles(userID);
  } catch (e) {
    log.error(`Unable to complete initial role sync for ${userID}.`, e);
  }

  if (hasRoles) {
    await queueVerification(userDiscordData.user.id, newUser);
  }

  return 'OK';
};

/**
 * Removes a user's Discord information from our database. This lets them link to another Discord account.
 * Note that this doesn't revoke the app grant on their end.
 *
 * @param userID
 */
export const disassociateFromDiscord = async (
  userID: string,
): Promise<string> => {
  const user = await User.findOne({
    _id: userID,
  });

  if (!user) {
    throw new NotFoundError('Unable to find the given user.');
  }

  try {
    let discordTokens = getDiscordTokensFromUser(user);
    discordTokens = await getAccessToken(userID, discordTokens);

    const userMetadata = {
      isorganizer: 0,
      isconfirmedhacker: 0,
    } as DiscordConnectionMetadata;

    await pushMetadata(discordTokens, userMetadata);
  } catch (e) {
    log.error(
      'Encountered error pushing metadata on Discord disassociation.',
      e,
    );
  }

  if (user.discord.discordID) {
    await queueVerification(user.discord.discordID, user, true);
  }

  await User.updateOne(
    {
      _id: userID,
    },
    {
      discord: {},
    },
  );

  return 'Disassociated user from the linked Discord account.';
};

/**
 * Gets the currently stored Discord metadata for the user
 *
 * @param userID
 */
export const fetchDiscordConnectionMetadata = async (
  userID?: string,
): Promise<DiscordConnectionMetadata> => {
  if (!userID) {
    throw new BadRequestError('UserID must be specified.');
  }

  const user = await User.findOne(
    {
      _id: userID,
    },
    [
      'discord.accessToken',
      'discord.accessTokenExpireTime',
      'discord.refreshToken',
    ],
  );

  if (!user) {
    throw new NotFoundError('Unable to find user with the given ID.');
  }

  if (
    !user.discord?.accessToken ||
    user.discord?.accessTokenExpireTime === undefined ||
    !user.discord?.refreshToken
  ) {
    throw new BadRequestError(
      'The given user is not linked to a Discord account via OAuth.',
    );
  }

  let discordTokens = getDiscordTokensFromUser(user);

  discordTokens = await getAccessToken(userID, discordTokens);

  return getMetadata(discordTokens);
};

export const addCheckInNotes = async (
  userID: string,
  notes: string[],
): Promise<string[]> => {
  if (!userID) {
    throw new BadRequestError('UserID must be specified.');
  }

  const user = await User.findOneAndUpdate(
    {
      _id: userID,
    },
    {
      $push: {
        checkInNotes: {
          $each: notes,
        },
      },
    },
    {
      new: true,
    },
  );

  if (!user) {
    throw new NotFoundError('Unable to find user with the given ID.');
  }

  return user.checkInNotes;
};

export const removeCheckInNotes = async (
  userID: string,
  notes: string[],
): Promise<string[]> => {
  if (!userID) {
    throw new BadRequestError('UserID must be specified.');
  }

  const user = await User.findOneAndUpdate(
    {
      _id: userID,
    },
    {
      $pull: {
        checkInNotes: {
          $in: notes,
        },
      },
    },
    {
      new: true,
    },
  );

  if (!user) {
    throw new NotFoundError('Unable to find user with the given ID.');
  }

  return user.checkInNotes;
};

export const registerUserMailingSubscriberID = async (
  userID: string,
  subscriberID: number,
) => {
  const user = await User.findOneAndUpdate(
    {
      _id: userID,
    },
    {
      mailingListSubcriberID: subscriberID,
    },
  );

  if (!user) {
    throw new NotFoundError('Unable to find user with the given ID.');
  }

  return user.mailingListSubcriberID;
};

export const syncUserMailingListsByID = async (userID: string) => {
  const user = await User.findById(userID);

  if (!user) {
    throw new NotFoundError('Unable to find user with the given ID.');
  }

  await syncUserMailingLists(user);

  return 'Success';
};
