import {
  CreateCheckRequest,
  DeleteCheckRequest,
  ReadCheckRequest,
  ReadInterceptRequest,
  WriteCheckRequest,
} from '../../types/checker';
import { BasicUser } from '../../types/types';

import discordShared from '../shared/discordShared';
import {
  canRSVP,
  canUpdateApplication,
  getRSVPDeadline,
  inEnum,
  isAdmin,
  isApplicationOpen,
  isOrganizer,
  isRSVPOpen,
  isUserOrOrganizer,
  maxLength,
  minLength,
  minWordLength,
  validatePostalCode,
} from '../validator';
import { enumOptions } from './enums';
import { maskStatus } from './interceptors';

// Main application
export const hackerApplication = {
  writeCheck: canUpdateApplication(),
  readCheck: true,

  FIELDS: {

    // We will set this internally when the application is updated
    lastUpdated: {
      type: Number,
      caption: 'Last Updated',

      readCheck: true,
      writeCheck: false,
      submitCheck: true,
    },

    // We will set the team code internally
    teamCode: {
      type: String,
      caption: 'Team Code',
      inTextSearch: true,

      readCheck: true,
      writeCheck: false,
      submitCheck: true,
    },

    /* About You */
    emailConsent: {
      type: Boolean,
      caption: 'Email consent',

      writeCheck: true,
      readCheck: true,
    },

    phoneNumber: {
      type: String,
      caption: 'Phone Number',
      inTextSearch: true,

      writeCheck: maxLength(50),
      submitCheck: (request: WriteCheckRequest<string, IUser>) => minLength(1)(request) && maxLength(50)(request),
      readCheck: true,
    },

    gender: {
      type: String,
      caption: 'Gender',
      inTextSearch: true,

      writeCheck: inEnum(enumOptions.gender, true),
      submitCheck: inEnum(enumOptions.gender),
      readCheck: true,
    },

    pronouns: {
      type: String,
      caption: 'Pronouns',
      inTextSearch: true,

      writeCheck: inEnum(enumOptions.pronouns, true),
      submitCheck: inEnum(enumOptions.pronouns),
      readCheck: true,
    },

    ethnicity: {
      type: String,
      caption: 'Ethnicity',
      inTextSearch: true,

      writeCheck: inEnum(enumOptions.ethnicity, true),
      submitCheck: inEnum(enumOptions.ethnicity),
      readCheck: true,
    },

    timezone: {
      type: String,
      caption: 'Timezone',
      inTextSearch: true,

      writeCheck: inEnum(enumOptions.timezone, true),
      submitCheck: inEnum(enumOptions.timezone),
      readCheck: true,
    },

    country: {
      type: String,
      caption: 'Country',
      inTextSearch: true,

      writeCheck: maxLength(256),
      submitCheck: (request: WriteCheckRequest<string, IUser>) => minLength(1)(request) && maxLength(256)(request),
      readCheck: true,
    },

    wantSwag: {
      type: Boolean,
      caption: 'I live in Canada and want to receive HT6 swag',

      writeCheck: true,
      readCheck: true,
    },

    /* Address */

    addressLine1: {
      type: String,
      caption: 'Address Line 1',
      inTextSearch: true,

      writeCheck: (request: WriteCheckRequest<string, IUser>) => request.submissionObject.hackerApplication.wantSwag
        ? maxLength(256)
        : !request.fieldValue,
      submitCheck: (request: WriteCheckRequest<string, IUser>) => request.submissionObject.hackerApplication.wantSwag
        ? minLength(1)(request) && maxLength(256)(request)
        : !request.fieldValue, // If they want swag they gotta fill the field, otherwise it should be falsy
      readCheck: true,
    },

    addressLine2: {
      type: String,
      caption: 'Address Line 2',
      inTextSearch: true,

      writeCheck: (request: WriteCheckRequest<string, IUser>) => request.submissionObject.hackerApplication.wantSwag
        ? maxLength(256)
        : !request.fieldValue,
      submitCheck: (request: WriteCheckRequest<string, IUser>) => request.submissionObject.hackerApplication.wantSwag
        ? maxLength(256)(request)
        : !request.fieldValue, // If they want swag they can do whatever they want, otherwise it should be falsy
      readCheck: true,
    },

    city: {
      type: String,
      caption: 'City',
      inTextSearch: true,

      writeCheck: (request: WriteCheckRequest<string, IUser>) => request.submissionObject.hackerApplication.wantSwag
        ? maxLength(256)
        : !request.fieldValue,
      submitCheck: (request: WriteCheckRequest<string, IUser>) => request.submissionObject.hackerApplication.wantSwag
        ? minLength(1)(request) && maxLength(256)(request)
        : !request.fieldValue, // If they want swag they gotta fill the field, otherwise it should be falsy
      readCheck: true,
    },

    province: {
      type: String,
      caption: 'Province',
      inTextSearch: true,

      writeCheck: (request: WriteCheckRequest<string, IUser>) => request.submissionObject.hackerApplication.wantSwag
        ? inEnum(enumOptions.province, true)(request)
        : !request.fieldValue, // If they want swag they gotta fill the field, otherwise it should be falsy,
      submitCheck: (request: WriteCheckRequest<string, IUser>) => request.submissionObject.hackerApplication.wantSwag
        ? inEnum(enumOptions.province)(request)
        : !request.fieldValue, // If they want swag they gotta fill the field, otherwise it should be falsy,
      readCheck: true,
    },

    postalCode: {
      type: String,
      caption: 'Postal Code',
      inTextSearch: true,

      writeCheck: (request: WriteCheckRequest<string, IUser>) => request.submissionObject.hackerApplication.wantSwag
        ? maxLength(6)
        : !request.fieldValue,
      submitCheck: (request: WriteCheckRequest<string, IUser>) => request.submissionObject.hackerApplication.wantSwag
        ? validatePostalCode()(request)
        : !request.fieldValue, // If they want swag they gotta have a valid postal code, otherwise it should be falsy
      readCheck: true,
    },

    /* Your experience */
    school: {
      type: String,
      caption: 'School',
      inTextSearch: true,

      writeCheck: maxLength(256),
      submitCheck: (request: WriteCheckRequest<string, IUser>) => minLength(1)(request) && maxLength(256)(request),
      readCheck: true,
    },

    program: {
      type: String,
      caption: 'Program',
      inTextSearch: true,

      writeCheck: maxLength(256),
      submitCheck: (request: WriteCheckRequest<string, IUser>) => minLength(1)(request) && maxLength(256)(request),
      readCheck: true,
    },

    yearsOfStudy: {
      type: String,
      caption: 'Years of study',
      inTextSearch: true,

      writeCheck: inEnum(enumOptions.yearsOfStudy, true),
      submitCheck: inEnum(enumOptions.yearsOfStudy),
      readCheck: true,
    },

    hackathonsAttended: {
      type: String,
      caption: 'Hackathons attended',
      inTextSearch: true,

      writeCheck: inEnum(enumOptions.hackathonsAttended, true),
      submitCheck: inEnum(enumOptions.hackathonsAttended),
      readCheck: true,
    },

    // The user cannot directly edit this field, but they can view it
    // We will set this when the user updates their application
    resumeFileName: {
      type: String,
      caption: 'Resume',
      inTextSearch: true,

      readCheck: true,
      writeCheck: false,
      submitCheck: (request: WriteCheckRequest<any, IUser>) => request.targetObject?.hackerApplication?.resumeFileName?.length > 0,
    },

    resumeSharePermission: {
      type: Boolean,
      caption: 'I allow Hack the 6ix to distribute my resume to its event sponsors',

      writeCheck: true,
      readCheck: true,
    },

    githubLink: {
      type: String,
      caption: 'GitHub',
      inTextSearch: true,

      writeCheck: maxLength(1024),
      readCheck: true,
    },

    portfolioLink: {
      type: String,
      caption: 'Portfolio',
      inTextSearch: true,

      writeCheck: maxLength(1024),
      readCheck: true,
    },

    linkedinLink: {
      type: String,
      caption: 'LinkedIn',
      inTextSearch: true,

      writeCheck: maxLength(1024),
      readCheck: true,
    },

    projectEssay: {
      type: String,
      caption: 'Project Essay',
      inTextSearch: true,

      writeCheck: maxLength(2056),
      submitCheck: (request: WriteCheckRequest<string, IUser>) => minWordLength(50)(request) && maxLength(2056)(request),
      readCheck: true,
    },

    /* At HT6 */
    requestedWorkshops: {
      type: String,
      caption: 'Requested Workshops',
      inTextSearch: true,

      writeCheck: maxLength(2056),
      readCheck: true,
    },

    preEventWorkshops: {
      type: String,
      caption: 'Would you be interested in attending introductory workshops the week prior to the hackathon?',
      inTextSearch: true,

      writeCheck: maxLength(10),
      readCheck: true,
    },

    accomplishEssay: {
      type: String,
      caption: 'Accomplishment Essay',
      inTextSearch: true,

      writeCheck: maxLength(2056),
      submitCheck: (request: WriteCheckRequest<string, IUser>) => minWordLength(50)(request) && maxLength(2056)(request),
      readCheck: true,
    },

    mlhCOC: {
      type: Boolean,
      caption: 'MLH COC',

      writeCheck: true,
      submitCheck: (request: WriteCheckRequest<boolean, IUser>) => request.fieldValue,
      readCheck: true,
    },

    mlhEmail: {
      type: Boolean,
      caption: 'MLH COC',

      writeCheck: true,
      readCheck: true,
    },

    mlhData: {
      type: Boolean,
      caption: 'MLH Data',

      writeCheck: true,
      submitCheck: (request: WriteCheckRequest<boolean, IUser>) => request.fieldValue,
      readCheck: true,
    },
  },
};

// Internal FIELDS; Only organizers can access them
const internal = {
  writeCheck: (request: WriteCheckRequest<any, IUser>) => isOrganizer(request.requestUser),
  readCheck: (request: ReadCheckRequest<IUser>) => isOrganizer(request.requestUser),

  FIELDS: {
    notes: {
      type: String,
      default: '',
      caption: 'Organizer Notes',

      writeCheck: true,
      readCheck: true,
    },

    computedApplicationScore: {
      type: Number,
      caption: 'Computed Application score',

      virtual: true,
      readCheck: true,
    },

    applicationScores: {
      writeCheck: (request: WriteCheckRequest<any, IUser>) => isAdmin(request.requestUser),
      readCheck: true,

      FIELDS: {
        accomplish: {
          writeCheck: true,
          readCheck: true,

          FIELDS: {
            score: {
              type: Number,
              default: -1,
              writeCheck: true,
              readCheck: true,
            },

            reviewer: {
              type: String,
              writeCheck: true,
              readCheck: true,
            },
          },
        },

        project: {
          writeCheck: true,
          readCheck: true,

          FIELDS: {
            score: {
              type: Number,
              default: -1,
              writeCheck: true,
              readCheck: true,
            },

            reviewer: {
              type: String,
              writeCheck: true,
              readCheck: true,
            },
          },
        },

        portfolio: {
          writeCheck: true,
          readCheck: true,

          FIELDS: {
            score: {
              type: Number,
              default: -1,
              writeCheck: true,
              readCheck: true,
            },

            reviewer: {
              type: String,
              writeCheck: true,
              readCheck: true,
            },
          },
        },
      },
    },
  },
};

// User application state
const status = {

  // Only organizers can modify statuses
  writeCheck: (request: ReadCheckRequest<IUser>) => isOrganizer(request.requestUser),
  readCheck: true,

  FIELDS: {
    textStatus: {
      type: String,
      virtual: true,
      caption: 'Status',

      readCheck: true,
    },

    internalTextStatus: {
      type: String,
      virtual: true,
      caption: 'Internal Status',

      readCheck: (request: ReadCheckRequest<IUser>) => isOrganizer(request.requestUser),
    },

    // Only admins can read this field
    statusReleased: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Status Released',

      writeCheck: true,
      readCheck: (request: ReadCheckRequest<IUser>) => isOrganizer(request.requestUser),
    },

    applied: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Applied',

      writeCheck: true,
      readCheck: true,
    },

    accepted: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Accepted',

      writeCheck: true,
      readCheck: true,

      readInterceptor: maskStatus<boolean>(false),
    },

    rejected: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Rejected',

      writeCheck: true,
      readCheck: true,

      readInterceptor: maskStatus<boolean>(false),
    },

    waitlisted: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Waitlisted',

      writeCheck: true,
      readCheck: true,

      readInterceptor: maskStatus<boolean>(false),
    },

    confirmed: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Confirmed',

      writeCheck: true,
      readCheck: true,
    },

    declined: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Declined',

      writeCheck: true,
      readCheck: true,
    },

    checkedIn: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Checked In',

      writeCheck: true,
      readCheck: true,
    },

    // Intercepted fields (virtual fields, but we populate them)
    canAmendTeam: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Can Amend Team',

      readCheck: true,

      readInterceptor: (request: ReadInterceptRequest<boolean, IUser>) => isApplicationOpen({
        ...request,
        requestUser: request.targetObject,
        fieldValue: undefined,
        submissionObject: undefined,
      }),
    },
    canApply: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Can Apply',

      readCheck: true,

      readInterceptor: (request: ReadInterceptRequest<boolean, IUser>) => canUpdateApplication()({
        ...request,
        requestUser: request.targetObject,
        fieldValue: undefined,
        submissionObject: undefined,
      }),
    },
    canRSVP: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Can RSVP',

      readCheck: true,

      readInterceptor: (request: ReadInterceptRequest<boolean, IUser>) => canRSVP()({
        ...request,
        requestUser: request.targetObject,
        fieldValue: undefined,
        submissionObject: undefined,
      }),
    },
    isRSVPOpen: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Is Confirmation Open',

      readCheck: true,

      readInterceptor: (request: ReadInterceptRequest<boolean, IUser>) => isRSVPOpen({
        ...request,
        requestUser: request.targetObject,
        fieldValue: undefined,
        submissionObject: undefined,
      }),
    },
  },
};


// Fields to inject into mailmerge
const mailmerge = {
  readCheck: (request: ReadCheckRequest<IUser>) => isOrganizer(request.requestUser),

  FIELDS: {
    FIRST_NAME: {
      type: String,
      readCheck: true,
      virtual: true,
    },
    LAST_NAME: {
      type: String,
      readCheck: true,
      virtual: true,
    },
    // All fields for transactional emails should be prefixed by MERGE
    // For mailing list enrollment, first and last name do not have the prefix, but we'll store a version
    // with it for the template emails
    MERGE_FIRST_NAME: {
      type: String,
      readCheck: true,
      virtual: true,
    },
    MERGE_LAST_NAME: {
      type: String,
      default: '',
      readCheck: true,
      virtual: true,
    },
    MERGE_APPLICATION_DEADLINE: {
      type: String,
      readCheck: true,
      virtual: true,
    },
    MERGE_CONFIRMATION_DEADLINE: {
      type: String,
      readCheck: true,
      virtual: true,
    },
  },
};

// User roles state
// **
//  These are VIRTUAL fields which are derived from "groups" and include all
//  roles this user has access to (even if the SAML assertion didn't explicitly
//  list all of them, e.g. admin has organizer access implicitly)
// **
const roles = {

  writeCheck: false,
  readCheck: true,
  virtual: true,

  FIELDS: {
    hacker: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Hacker',
      virtual: true,
      readCheck: true,
    },

    admin: {
      type: Boolean,
      required: true,
      default: false,
      virtual: true,
      caption: 'Admin',

      readCheck: true,
    },

    organizer: {
      type: Boolean,
      required: true,
      default: false,
      virtual: true,
      caption: 'Organizer',

      readCheck: true,
    },

    volunteer: {
      type: Boolean,
      required: true,
      default: false,
      virtual: true,
      caption: 'Volunteer',

      readCheck: true,
    },
  },
};

// User groups state
// **
//  These are directly passed in by Keycloak and may not reflect all the
//  roles a user has. Please use the "roles" field fro that
// **
const groups = {

  writeCheck: false,
  readCheck: false,

  FIELDS: {
    hacker: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Hacker',
    },

    admin: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Admin',
    },

    organizer: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Organizer',
    },

    volunteer: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Volunteer',
    },
  },
};

export const fields = {

  /**
   * NOTE: READ/WRITE RULES ARE TESTED OUTSIDE IN.
   *       THIS MEANS THAT IF AN "OUTER" RULE FAILS, WE STOP AND DO NOT
   *       CHECK ANY OF THE INNER ONES
   *
   * WARNING: THESE RULES CASCADE ACROSS ALL OTHER FIELDS IN THIS MODEL!
   *          CHANGING THEM MAY SIGNIFICANTLY ALTER THE SECURITY OF THE SYSTEM!
   *
   * Omitted readCheck/writeCheck rules will default to false to be safe (aka always reject)
   */
  writeCheck: (request: WriteCheckRequest<any, IUser>) => isUserOrOrganizer(request.requestUser, request.targetObject),
  readCheck: (request: ReadCheckRequest<IUser>) => isUserOrOrganizer(request.requestUser, request.targetObject),

  deleteCheck: (request: DeleteCheckRequest<IUser>) => isAdmin(request.requestUser),
  createCheck: (request: CreateCheckRequest<any, IUser>) => isAdmin(request.requestUser),

  // Root FIELDS
  FIELDS: {
    _id: {
      virtual: true,
      readCheck: true,
    },

    lastLogout: {
      type: Number,
      required: true,
      caption: 'Last logout',
      default: 0,

      readCheck: false,
      writeCheck: (request: WriteCheckRequest<string, IUser>) => isOrganizer(request.requestUser),
    },

    idpLinkID: {
      type: String,
      required: true,
      caption: 'SAML Name ID',
      index: true,

      readCheck: false,
      writeCheck: (request: WriteCheckRequest<string, IUser>) => isOrganizer(request.requestUser),
    },

    fullName: {
      type: String,
      required: true,
      virtual: true,
      caption: 'Full Name',
      inTextSearch: true,

      readCheck: true,
    },

    firstName: {
      type: String,
      required: true,
      caption: 'First Name',
      inTextSearch: true,

      writeCheck: (request: WriteCheckRequest<string, IUser>) => isOrganizer(request.requestUser) && maxLength(64)(request),
      readCheck: true,
    },

    lastName: {
      type: String,
      required: true,
      caption: 'Last Name',
      inTextSearch: true,

      writeCheck: (request: WriteCheckRequest<string, IUser>) => isOrganizer(request.requestUser) && maxLength(64)(request),
      readCheck: true,
    },

    email: {
      type: String,
      required: true,
      caption: 'Email',
      inTextSearch: true,

      writeCheck: (request: WriteCheckRequest<string, IUser>) => isOrganizer(request.requestUser) && maxLength(64)(request),
      readCheck: true,
    },

    created: {
      type: Number,
      caption: 'Created',
      default: Date.now,

      readCheck: true,
    },
    personalConfirmationDeadline: {
      type: Number,
      caption: 'RSVP Deadline',

      writeCheck: (request: WriteCheckRequest<string, IUser>) => isOrganizer(request.requestUser),
      readCheck: true,
    },

    // Some hackers are special and want to apply after the global deadline
    personalApplicationDeadline: {
      type: Number,
      caption: 'Personal Application Deadline',

      writeCheck: (request: WriteCheckRequest<string, IUser>) => isOrganizer(request.requestUser),
      readCheck: true,
    },

    // If the user has a personal deadline, it takes precedence over the global deadline
    computedApplicationDeadline: {
      type: Number,
      virtual: true,
      readCheck: true,

      /*
      readInterceptor: (request: ReadInterceptRequest<string, IUser>) => getApplicationDeadline({
        ...request,
        requestUser: request.targetObject,
        submissionObject: {} as IUser,
      }),*/
    },
    computedConfirmationDeadline: {
      type: Number,
      default: 0,

      readCheck: true,
      readInterceptor: (request: ReadInterceptRequest<string, IUser>) => getRSVPDeadline({
        ...request,
        requestUser: request.targetObject,
        submissionObject: {} as IUser,
      }),
    },
    discord: discordShared,
    roles: roles,
    groups: groups,
    status: status,
    hackerApplication: hackerApplication,
    internal: internal,
    mailmerge: mailmerge,
  },
};

export interface IRoles { // Virtual field with all "lesser" roles populated
  hacker: boolean,
  admin: boolean,
  organizer: boolean,
  volunteer: boolean
}

export interface IStatus {
  statusReleased?: boolean,
  applied?: boolean,
  accepted?: boolean,
  rejected?: boolean,
  waitlisted?: boolean,
  confirmed?: boolean,
  declined?: boolean,
  checkedIn?: boolean,

  // Intercepted fields (since they require universe state)
  canAmendTeam?: boolean,
  canApply?: boolean,
  canRSVP?: boolean,
  isRSVPOpen?: boolean,

  textStatus: string
  internalTextStatus: string
}

export interface IUser extends BasicUser {
  lastLogout: number,
  idpLinkID: string,
  fullName: string,
  created: number,
  personalConfirmationDeadline?: number,
  personalApplicationDeadline?: number,
  roles: IRoles,
  groups: IRoles, // Raw group from KEYCLOAK
  status: IStatus,
  hackerApplication: IApplication,
  internal: {
    notes?: string,
    computedApplicationScore?: number,
    computedFinalApplicationScore?: number, // This value is added by get-rank and usually isn't populated
    applicationScores?: {
      accomplish: {
        score: number
        reviewer: string
      },
      project: {
        score: number
        reviewer: string
      },
      portfolio: {
        score: number
        reviewer: string
      },
    }
  },
  mailmerge: IMailMerge,
  computedApplicationDeadline: number,
  computedConfirmationDeadline: number
}

export interface IMailMerge {
  FIRST_NAME: string,
  LAST_NAME: string,
  MERGE_FIRST_NAME: string,
  MERGE_LAST_NAME: string,
  MERGE_APPLICATION_DEADLINE: string,
  MERGE_CONFIRMATION_DEADLINE: string
}

export interface IApplication {
  lastUpdated: number,
  phoneNumber: string,
  teamCode: string,
  emailConsent: boolean,
  gender: string,
  pronouns: string,
  ethnicity: string,
  timezone: string,
  country: string,
  wantSwag: boolean,
  addressLine1: string,
  addressLine2: string,
  city: string,
  province: string,
  postalCode: string,
  school: string,
  program: string,
  yearsOfStudy: string,
  hackathonsAttended: string,
  resumeFileName: string,
  resumeSharePermission: boolean,
  githubLink: string,
  portfolioLink: string,
  linkedinLink: string,
  projectEssay: string,
  requestedWorkshops: string,
  accomplishEssay: string,
  mlhCOC: boolean,
  mlhEmail: boolean,
  mlhData: boolean,
  preEventWorkshops: string
}
