/**
 * Model dependent API endpoints
 */

import express, { Request, Response } from 'express';
import { resumeExport, waiverExport } from '../services/dataexport';
import assignAdmissionStatus from '../controller/applicationStatus/assignApplicationStatus';
import getRanks from '../controller/applicationStatus/getRanks';
import getRanksV2 from '../controller/applicationStatus/getRanksV2';
import { createAPIToken } from '../controller/AuthController';
import {
  getNextQueuedVerification,
  requeueVerification,
  verifyDiscordUser,
} from '../controller/DiscordController';
import { recordJoin, recordLeave } from '../controller/MeetingController';
import {
  getObject,
  initializeSettingsMapper,
} from '../controller/ModelController';
import {
  createTeam,
  getTeam,
  joinTeam,
  leaveTeam,
} from '../controller/TeamController';
import {
  checkIn,
  fetchUser,
  generateCheckInQR,
  getCandidate,
  getCheckInQR,
  getEnumOptions,
  gradeCandidate,
  releaseApplicationStatus,
  rsvp,
  updateApplication,
  updateResume,
  fetchUserByDiscordID,
  associateWithDiscord,
  fetchDiscordConnectionMetadata,
  disassociateFromDiscord,
  addCheckInNotes,
  removeCheckInNotes,
  getResumeURL,
  syncUserMailingListsByID,
  getDownloadPassQR,
  updateWaiver,
  getWaiverURL,
} from '../controller/UserController';
import {
  generateOTP,
  verifyOTP,
  getAllOTPs,
  expireOTP,
} from '../controller/OTPController';
import { logResponse } from '../services/logger';
import sendAllTemplates from '../services/mailer/sendAllTemplates';
import sendTemplateEmail from '../services/mailer/sendTemplateEmail';
import syncMailingLists from '../services/mailer/syncMailingLists';
import verifyMailingList from '../services/mailer/verifyMailingList';
import {
  isAdmin,
  isAuthenticated,
  isHacker,
  isOrganizer,
  isVolunteer,
} from '../services/permissions';
import { getStatistics } from '../services/statistics';
import { AllUserTypes } from '../types/types';
import { generateDiscordOAuthUrl } from '../services/discordApi';

const actionRouter = express.Router();

// Any authenticated user endpoints
/**
 * (Hacker)
 *
 * Generate Discord link URL
 */
actionRouter.post(
  '/discordOAuthUrl',
  isAuthenticated,
  (req: Request, res: Response) => {
    logResponse(req, res, generateDiscordOAuthUrl(req.body.redirectUrl));
  },
);

/**
 * (Hacker)
 *
 * Associate Discord account given a state and OAuth code
 */
actionRouter.post(
  '/associateDiscord',
  isAuthenticated,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      associateWithDiscord(req.executor!._id, req.body.state, req.body.code),
    );
  },
);

// Application endpoints

/**
 * (Hacker)
 *
 * Get hacker profile
 */
actionRouter.get('/profile', isHacker, (req: Request, res: Response) => {
  logResponse(req, res, fetchUser(req.executor!));
});

/**
 * (Hacker)
 *
 * Get application settings
 */
actionRouter.get(
  '/applicationSettings',
  isHacker,
  (req: Request, res: Response) => {
    logResponse(req, res, getObject(req.executor!, 'settings', {}));
  },
);

/**
 * (Hacker)
 *
 * Submit/Save hacker application
 */
actionRouter.post('/updateapp', isHacker, (req: Request, res: Response) => {
  logResponse(
    req,
    res,
    updateApplication(req.executor!, req.body.submit, req.body.application),
    true,
  );
});

/**
 * (Hacker)
 *
 * Submit resume
 */
actionRouter.put('/updateResume', isHacker, (req: Request, res: Response) => {
  logResponse(
    req,
    res,
    updateResume(req.executor!, (req as any)?.files?.resume),
    true,
  );
});

/**
 * (Hacker)
 *
 * Get resume URL
 */
actionRouter.get('/getResumeURL', isHacker, (req: Request, res: Response) => {
  logResponse(req, res, getResumeURL(req.executor!));
});

/**
 * (Hacker)
 *
 * Fetch hacker application enum options
 */
actionRouter.get(
  '/applicationEnums',
  isHacker,
  (req: Request, res: Response) => {
    logResponse(req, res, getEnumOptions());
  },
);

/**
 * (Hacker)
 *
 * Create team
 */
actionRouter.post('/createTeam', isHacker, (req: Request, res: Response) => {
  logResponse(req, res, createTeam(req.executor!), true);
});

/**
 * (Hacker)
 *
 * Join team
 */
actionRouter.post('/joinTeam', isHacker, (req: Request, res: Response) => {
  logResponse(req, res, joinTeam(req.executor!, req.body.teamCode), true);
});

/**
 * (Hacker)
 *
 * Leave team
 */
actionRouter.post('/leaveTeam', isHacker, (req: Request, res: Response) => {
  logResponse(req, res, leaveTeam(req.executor!), true);
});

/**
 * (Hacker)
 *
 * Get team
 */
actionRouter.get('/getTeam', isHacker, (req: Request, res: Response) => {
  logResponse(req, res, getTeam(req.executor!));
});

/**
 * (Hacker)
 *
 * Confirm whether or not they will be attending.
 */
actionRouter.post('/rsvp', isHacker, (req: Request, res: Response) => {
  logResponse(req, res, rsvp(req.executor!, req.body.rsvp), true);
});

/**
 * (Hacker)
 *
 * Get check in QR code
 */
actionRouter.get('/checkInQR', isHacker, (req: Request, res: Response) => {
  logResponse(req, res, getCheckInQR(req.executor!._id, 'User'));
});

/**
 * (Hacker)
 *
 * Get QR code to redirect to download pass page
 */
actionRouter.get('/downloadPassQR', (req: Request, res: Response) => {
  const { userId, userType, userName } = req.query;
  const user = {
    id: userId as string,
    type: userType as AllUserTypes,
    name: userName as string,
  };
  logResponse(req, res, getDownloadPassQR(user));
});

// Volunteer endpoints

/**
 * (Volunteer)
 *
 * Check a user in
 */

actionRouter.post('/checkIn', isVolunteer, (req: Request, res: Response) => {
  logResponse(req, res, checkIn(req.body.userID, req.body.userType));
});

// Admin endpoints

/**
 * (Organizer)
 *
 * Statistics
 */
actionRouter.get(
  '/getStatistics',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      getStatistics(req?.query?.update?.toString()?.toLowerCase() === 'true'),
    );
  },
);

/**
 * (Admin)
 *
 * Sync mailing lists
 */
actionRouter.post(
  '/syncMailingLists',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(req, res, syncMailingLists(req.body.mailingLists), true);
  },
);

/**
 * (Admin)
 *
 * Sync user mailing lists
 */
actionRouter.post(
  '/syncUserMailingLists',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(req, res, syncUserMailingListsByID(req.body.userID), true);
  },
);

/**
 * (Admin)
 *
 * Verify mailing lists
 */
actionRouter.post(
  '/verifyMailingList',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      verifyMailingList(req.executor!, req.body.subscriberID),
      true,
    );
  },
);

/**
 * (Admin)
 *
 * Send singular email
 */
actionRouter.post('/sendEmail', isOrganizer, (req: Request, res: Response) => {
  logResponse(
    req,
    res,
    sendTemplateEmail(req.body.email, req.body.templateName, req.body.tags),
    true,
  );
});

/**
 * (Admin)
 *
 * Send an email using every available template to the requesting user
 */
actionRouter.post(
  '/templateTest',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      sendAllTemplates(req.body.subscriberID, req.body.additional_data),
      true,
    );
  },
);

/**
 * (Admin)
 *
 * Iterates through all documents and ensures the settingsMapper field is populated.
 * We use this field to populate the user object with data from global settings, such as deadlines.
 * Refer to the README for more information.
 *
 * This endpoint should only be needed for migrating old databases.
 */
actionRouter.post(
  '/initializeSettingsMapper',
  isAdmin,
  (req: Request, res: Response) => {
    logResponse(req, res, initializeSettingsMapper(), true);
  },
);
/**
 * (Admin)
 *
 * Set application released status to true for all users who have been either waitlisted, accepted, or rejected
 */
actionRouter.post(
  '/releaseApplicationStatus',
  isAdmin,
  (req: Request, res: Response) => {
    logResponse(req, res, releaseApplicationStatus(), true);
  },
);

/**
 * (Organizer)
 *
 * Get a list of applied users in descending order of computed score
 */
actionRouter.get('/getRanks', isOrganizer, (req: Request, res: Response) => {
  logResponse(req, res, getRanks(req.query.usePersonalScore === 'true'));
});

/**
 * (Organizer)
 *
 * Get a list of applied users in descending order of computed score
 */
actionRouter.get('/getRanksV2', isOrganizer, (req: Request, res: Response) => {
  logResponse(req, res, getRanksV2(req.query.usePersonalScore === 'true'));
});

/**
 * (Admin)
 *
 * Assign the application status to users using the grading algorithm.
 */
actionRouter.post(
  '/assignApplicationStatus',
  isAdmin,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      assignAdmissionStatus(
        req.body.legit,
        req.body.waitlistOver,
        req.body.waitlistDeadline,
      ),
      true,
    );
  },
);

/**
 * (Organizer)
 *
 * Fetch a random applicant to review
 */
actionRouter.get(
  '/getCandidate',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      getCandidate(req.executor!, req.query.category as string),
    );
  },
);

/**
 * (Organizer)
 *
 * Assign a grade to an applicant
 */
actionRouter.post(
  '/gradeCandidate',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      gradeCandidate(req.executor!, req.body.candidateID, req.body.grade),
      true,
    );
  },
);

/**
 * (Organizer)
 *
 * Associate a user on Discord
 */
actionRouter.post(
  '/verifyDiscord',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      verifyDiscordUser(
        req.body.email,
        req.body.discordID,
        req.body.discordUsername,
      ),
      true,
    );
  },
);

/**
 * (Organizer)
 *
 * Fetch user by Discord ID
 */
actionRouter.get(
  '/getUserByDiscordID',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(req, res, fetchUserByDiscordID(req.query.discordID as string));
  },
);

/**
 * (Organizer)
 *
 * Create an API token for programmatic access
 */
actionRouter.post('/createAPIToken', isAdmin, (req: Request, res: Response) => {
  logResponse(
    req,
    res,
    createAPIToken(req.executor!, req.body.groups, req.body.description),
  );
});

/**
 * (Organizer)
 *
 * Record someone joining a meeting
 */
actionRouter.post(
  '/recordMeetingJoin',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      recordJoin(
        req.body.meetingID,
        req.body.userID,
        req.body.time || Date.now(),
      ),
    );
  },
);

/**
 * (Organizer)
 *
 * Record someone leaving a meeting
 */
actionRouter.post(
  '/recordMeetingLeave',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      recordLeave(
        req.body.meetingID,
        req.body.userID,
        req.body.time || Date.now(),
      ),
    );
  },
);
export default actionRouter;

/**
 * (Organizer)
 *
 * Get a ZIP of all resumes from users who have consented to resume sharing
 */
actionRouter.get(
  '/resumeExport',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(req, res, resumeExport(res));
  },
);

/**
 * (Organizer)
 *
 * Generate check in QR codes for a list of (External) User
 */
actionRouter.post(
  '/multiCheckInQR',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(req, res, generateCheckInQR(req.executor!, req.body.userList));
  },
);

/**
 * (Organizer)
 *
 * Disassociate Discord account from a user
 */
actionRouter.post(
  '/disassociateDiscord',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(req, res, disassociateFromDiscord(req.body.userID));
  },
);

/**
 * (Organizer)
 *
 * Get linked Discord metadata for a user
 */
actionRouter.get(
  '/discordMetadata',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      fetchDiscordConnectionMetadata(req.query.userID as string),
    );
  },
);

/**
 * (Organizer)
 *
 * Get next queued Discord verification
 */
actionRouter.get(
  '/getNextQueuedDiscordVerification',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(req, res, getNextQueuedVerification());
  },
);

/**
 * (Organizer)
 *
 * Get next queued Discord verification
 */
actionRouter.post(
  '/requeueDiscordVerification',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      requeueVerification(
        req.body.queuedVerificationID,
        req.body.earliestRetryAt,
      ),
    );
  },
);

/**
 * (Organizer)
 *
 * Add check in notes to user
 */
actionRouter.post(
  '/addCheckInNotes',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      addCheckInNotes(req.body.userID, req.body.checkInNotes),
    );
  },
);

/**
 * (Organizer)
 *
 * Remove check in notes from user
 */
actionRouter.post(
  '/removeCheckInNotes',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(
      req,
      res,
      removeCheckInNotes(req.body.userID, req.body.checkInNotes),
    );
  },
);

/**
 * (Hacker)
 *
 * Submit waiver
 */
actionRouter.put('/updateWaiver', isHacker, (req: Request, res: Response) => {
  logResponse(
    req,
    res,
    updateWaiver(req.executor!, (req as any)?.files?.waiver),
    true,
  );
});

/**
 * (Hacker)
 *
 * Get waiver URL
 */
actionRouter.get('/getWaiverURL', isHacker, (req: Request, res: Response) => {
  logResponse(req, res, getWaiverURL(req.executor!));
});

/**
 * (Organizer)
 *
 * Get a ZIP of all waivers from users who have submitted them
 */
actionRouter.get(
  '/waiverExport',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(req, res, waiverExport(res));
  },
);

/**
 * (Organizer)
 *
 * Generate OTP for volunteer
 */
actionRouter.post(
  '/generate-otp',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(req, res, generateOTP(req.executor!, req.body.email));
  },
);

/**
 * Verify OTP for volunteer
 */
actionRouter.post('/verify-otp', (req: Request, res: Response) => {
  logResponse(req, res, verifyOTP(null, req.body.code, req.body.email));
});

/**
 * (Organizer)
 *
 * Get all OTP codes
 */
actionRouter.get(
  '/get-all-otps',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(req, res, getAllOTPs(req.executor!));
  },
);

/**
 * (Organizer)
 *
 * Expire OTP code
 */
actionRouter.delete(
  '/expire-otp/:otpId',
  isOrganizer,
  (req: Request, res: Response) => {
    logResponse(req, res, expireOTP(req.executor!, req.params.otpId));
  },
);
