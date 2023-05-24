import { Mongoose } from 'mongoose';
import * as qrcode from 'qrcode';
import { enumOptions } from '../models/user/enums';
import {fields, IPartialApplication, IUser} from '../models/user/fields';
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
  AllUserTypes, BasicUser,
  IRSVP,
  QRCodeGenerateBulkResponse,
  QRCodeGenerateRequest
} from '../types/types';
import { writeGridFSFile } from './GridFSController';
import { editObject, getObject } from './ModelController';
import { testCanUpdateApplication, validateSubmission } from './util/checker';
import { fetchUniverseState, getModels } from './util/resources';
import {log} from "../services/logger";
import ExternalUser from "../models/externaluser/ExternalUser";


export const createFederatedUser = async (linkID: string, email: string, firstName: string, lastName: string, groupsList: string[], groupsHaveIDPPrefix = true): Promise<IUser> => {
  const groups: any = {};

  // Update the groups this user is in in the database
  // Ensure that we set all the groups the user is not in to FALSE and not NULL
  for (const group of Object.keys(fields.FIELDS.groups.FIELDS) || []) {
    //                                              Assertion includes group with leading /
    groups[group] = (groupsList || []).indexOf(`${groupsHaveIDPPrefix ? process.env.IDP_GROUP_PREFIX : ''}${group}`) !== -1;
  }

  const userInfo = await User.findOneAndUpdate({
    idpLinkID: linkID,
  }, {
    email: email.toLowerCase(),
    firstName: firstName,
    lastName: lastName,
    groups: groups,
  }, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });

  return userInfo;
};

/**
 * Fetch a sanitized user profile of the requester
 */
export const fetchUser = async (requestUser: IUser) => {
  const data = await getObject(
    requestUser,
    'user',
    {
      filter: {
        _id: requestUser._id,
      },
      size: '1',
    },
  );

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
export const updateApplication = async (requestUser: IUser, submit: boolean, hackerApplication: IPartialApplication) => {

  const hackerApplicationFields = getModels()['user'].rawFields.FIELDS.hackerApplication;

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
    const invalidFields: [string, string | undefined][] = validateSubmission(hackerApplication, hackerApplicationFields, writeRequest, '');

    if (invalidFields.length > 0) {
      throw new SubmissionDeniedError(invalidFields);
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

  if (!result || result.length !== 1 || result[0] != requestUser._id.toString()) {
    throw new InternalServerError('Unable to update application', JSON.stringify(result));
  }

  // Lastly, if the user intends to submit we will amend their user object with the new status
  // We will directly interface with the User model since this update will be done with "admin permissions"
  const statusUpdateResult = await User.findOneAndUpdate({
    _id: requestUser._id,
  }, {
    'status.applied': !!submit,
    'hackerApplication.lastUpdated': new Date().getTime(),
  });

  if (!statusUpdateResult) {
    throw new InternalServerError('Unable to update status');
  }

  if (submit) {
    await syncMailingLists(undefined, true, requestUser.email);
    await sendTemplateEmail(requestUser.email, MailTemplate.applied);
  }

  return 'Success';
};

/**
 * Update resume on file. Only pdf files under 5MB will be allowed.
 *
 * Reference: https://stackoverflow.com/questions/16482233/store-file-in-mongos-gridfs-with-expressjs-after-upload
 *
 * @param requestUser
 * @param expressFile - express fileupload file object
 * @param mongoose - instance of mongoose to extract connection from
 */
export const updateResume = async (requestUser: IUser, expressFile: any, mongoose: Mongoose) => {
  if (!expressFile) {
    throw new BadRequestError('Invalid file');
  }

  // Make sure user is allowed to edit their app
  await testCanUpdateApplication(requestUser);

  // Ensure file is within limit
  // NOTE: There is another limit set when express-fileupload is initialized in index.ts
  if (expressFile.size > 5000000) {
    throw new ForbiddenError('File exceeds 5MB');
  }

  // Ensure file type is correct
  if (expressFile.mimetype !== 'application/pdf') {
    throw new ForbiddenError('Invalid file type! Must be PDF');
  }

  const filename = `${requestUser._id}-resume.pdf`;

  await writeGridFSFile(filename, mongoose, expressFile);

  // Save new resume id to DB
  await User.findOneAndUpdate({
    _id: requestUser._id,
  }, {
    'hackerApplication.resumeFileName': filename,
  });

  return 'Success';
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

    await User.findOneAndUpdate({
      _id: requestUser._id,
    }, {
      'status.confirmed': isAttending,
      'status.declined': !isAttending,
      'rsvpForm': rsvp.form
    });

    await syncMailingLists(undefined, true, requestUser.email);

    if (isAttending) {
      await sendTemplateEmail(requestUser.email, MailTemplate.confirmed);
    } else {
      await sendTemplateEmail(requestUser.email, MailTemplate.declined);
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

    return (await getObject(requestUser, 'user', {
      filter: criteria,
      size: '1',
      page: offset.toString(),
    }))[0];
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
export const gradeCandidate = async (requestUser: IUser, targetUserID: string, grade: any) => {

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

  if (!user.status.applied || user.status.accepted || user.status.waitlisted || user.status.rejected) {
    throw new ForbiddenError('Candidate is not eligible to be graded');
  }

  const changes: any = {};

  for (const category in grade) {

    if (user.internal.applicationScores && category in user.internal.applicationScores) {
      const score = parseInt(grade[category]);

      if (!isNaN(score)) {
        changes[`internal.applicationScores.${category}.score`] = score;
        changes[`internal.applicationScores.${category}.reviewer`] = requestUser._id.toString();
      } else {
        throw new BadRequestError(`Could not parse score ${grade[category]} for category "${category}`);
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

  const usersModified = (await User.find(filter)).map((u: IUser) => u._id.toString());

  await User.updateMany(filter, {
    'status.statusReleased': true,
  });

  await syncMailingLists(undefined, true);

  return usersModified;
};

/**
 * Retrieves a user from their Discord ID
 *
 * @param discordID
 */
export const fetchUserByDiscordID = async (discordID: string): Promise<BasicUser> => {
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
const createCheckInQR = (userID:string, userType:AllUserTypes):Promise<string> => {
  return new Promise((resolve, reject) => {
    qrcode.toDataURL(JSON.stringify({
      "userID": userID,
      "userType": userType
    }), function (err, url) {
      if(err){
        return reject(err);
      }
      return resolve(url);
    })
  });
}

/**
 * Retrieve a user's check in QR code, generating if not exists
 *
 * @param requestUser
 * @param userType
 */

export const getCheckInQR = (requestUser: string, userType:AllUserTypes):Promise<string> => {
  const userID = String(requestUser);

  return new Promise((resolve, reject) => {
    if(userType === "User") {
      User.findOne({
        _id: userID
      }, 'checkInQR').then((user) => {
        if(!user){
          return reject(new NotFoundError(`User with ID ${userID} does not exist!`));
        }
        if(user.checkInQR){
          return resolve(user.checkInQR);
        }
        else {
          // We need to generate the QR code
          createCheckInQR(userID, userType).then((qrCode) => {
            User.updateOne({
              _id: userID
            }, {
              checkInQR: qrCode
            }).then(() => {
              return resolve(qrCode)
            }).catch(reject)
          }).catch(reject)
        }
      });
    }
    else if(userType === "ExternalUser") {
      ExternalUser.findOne({
        _id: userID
      }, 'checkInQR').then((externalUser) => {
        if(!externalUser){
          return reject(new NotFoundError(`ExternalUser with ID ${userID} does not exist!`));
        }
        if(externalUser.checkInQR){
          return resolve(externalUser.checkInQR);
        }
        else {
          // We need to generate the QR code
          createCheckInQR(userID, userType).then((qrCode) => {
            ExternalUser.updateOne({
              _id: userID
            }, {
              checkInQR: qrCode
            }).then(() => {
              return resolve(qrCode)
            }).catch(reject)
          }).catch(reject)
        }
      });
    }
    else {
      return reject(new BadRequestError("Invalid user type for request."))
    }
  });
}

/**
 * Generate a QR Code for a list of (External) Users
 *
 * @param requestUser
 * @param userList
 */
export const generateCheckInQR = async (requestUser: IUser, userList: QRCodeGenerateRequest[]):Promise<QRCodeGenerateBulkResponse[]> => {
  const ret = [] as QRCodeGenerateBulkResponse[];

  for(const user of userList){
    if(user.userID && user.userType){
      try {
        ret.push({ ...user, "code": await getCheckInQR(user.userID, user.userType)});
      }
      catch(err) {
        throw new InternalServerError(`Error encountered while generating QR code for ${user.userID} and type ${user.userType}.`, err);
      }
    }
  }

  return ret;
}

/**
 * Set a User or ExternalUser as checked in
 *
 * @param userID
 * @param userType
 * @param checkInTime
 */

export const checkIn = async (userID: string, userType: AllUserTypes, checkInTime = Date.now()): Promise<string[]> => {
  const newStatus = {
    'status.checkedIn': true,
    'status.checkInTime': checkInTime
  };

  if(userType === "User") {
    const user = await User.findOneAndUpdate({
      _id: userID,
      'status.confirmed': true
    }, newStatus, {
      new: true
    })
    if(!user){
      throw new NotFoundError("Unable to find RSVP'd user with given ID. Ensure they have RSVP'd and that the user ID/QR matches!");
    }
    return user.checkInNotes;
  }
  else if(userType === "ExternalUser"){
    const user = await ExternalUser.findOneAndUpdate({
      _id: userID
    }, newStatus, {
      new: true
    })
    if(!user){
      throw new NotFoundError("Unable to find external user with given ID. Ensure that the user ID/QR matches!");
    }
    return user.checkInNotes;
  }

  throw new BadRequestError("Given user type is invalid.")
}
