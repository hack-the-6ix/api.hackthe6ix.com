import {
  CreateCheckRequest,
  DeleteCheckRequest,
  ReadCheckRequest,
  WriteCheckRequest,
} from '../../types/checker';
import { BasicUser } from '../../types/types';

import discordShared from '../shared/discordShared';
import {
  inEnum,
  isAdmin,
  isOrganizer,
  isUserOrOrganizer,
  maxLength,
  maxWordLength,
  minLength,
  minWordLength,
  withinInt,
} from '../validator';
import { enumOptions } from './enums';
import { maskStatus } from './interceptors';
import { multiInEnum } from '../validator';

// Hacker emergency contact info
export const emergencyContact = {
  writeCheck: true,
  readCheck: true,
  FIELDS: {
    firstName: {
      type: String,
      caption: 'Emergency Contact First Name',
      writeCheck: maxLength(256),
      submitCheck: (request: WriteCheckRequest<string, IUser>) =>
        minLength(1)(request) && maxLength(256)(request),
      readCheck: true,
    },
    lastName: {
      type: String,
      caption: 'Emergency Contact Last Name',
      writeCheck: maxLength(256),
      submitCheck: (request: WriteCheckRequest<string, IUser>) =>
        minLength(1)(request) && maxLength(256)(request),
      readCheck: true,
    },
    phoneNumber: {
      type: String,
      caption: 'Emergency Contact Phone Number',
      inTextSearch: true,

      writeCheck: maxLength(50),
      submitCheck: (request: WriteCheckRequest<string, IUser>) =>
        minLength(1)(request) && maxLength(50)(request),
      readCheck: true,
    },
    relationship: {
      type: String,
      caption: 'Emergency Contact Relationship',

      writeCheck: inEnum(enumOptions.emergencyContactRelationship, true),
      submitCheck: inEnum(enumOptions.emergencyContactRelationship),
      readCheck: true,
    },
  },
};

// Main application
export const hackerApplication = {
  writeCheck: true,
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
      submitCheck: (request: WriteCheckRequest<string, IUser>) =>
        minLength(1)(request) && maxLength(50)(request),
      readCheck: true,
    },

    age: {
      type: Number,
      caption: 'Current age',
      inTextSearch: true,

      writeCheck: true,
      submitCheck: withinInt(14, 100),
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

    ethnicity: {
      type: String,
      caption: 'Ethnicity',
      inTextSearch: true,

      writeCheck: inEnum(enumOptions.ethnicity, true),
      submitCheck: inEnum(enumOptions.ethnicity),
      readCheck: true,
    },

    country: {
      type: String,
      caption: 'Country',
      inTextSearch: true,

      writeCheck: maxLength(256),
      submitCheck: (request: WriteCheckRequest<string, IUser>) =>
        minLength(1)(request) && maxLength(256)(request),
      readCheck: true,
    },

    shirtSize: {
      type: String,
      caption: 'Shirt Size',

      writeCheck: inEnum(enumOptions.shirt, true),
      submitCheck: inEnum(enumOptions.shirt),
      readCheck: true,
    },

    dietaryRestrictions: {
      type: String,
      caption: 'Dietary Restrictions',
      writeCheck: inEnum(enumOptions.dietaryRestrictions, true),
      submitCheckL: inEnum(enumOptions.dietaryRestrictions, true),
      readCheck: true,
    },

    /* Address */
    city: {
      type: String,
      caption: 'City',
      inTextSearch: true,

      writeCheck: (request: WriteCheckRequest<string, IUser>) =>
        minLength(1)(request) && maxLength(256)(request),
      submitCheck: (request: WriteCheckRequest<string, IUser>) =>
        minLength(1)(request) && maxLength(256)(request),
      readCheck: true,
    },

    province: {
      type: String,
      caption: 'Province/State',
      inTextSearch: true,

      writeCheck: (request: WriteCheckRequest<string, IUser>) =>
        maxLength(256)(request),
      submitCheck: (request: WriteCheckRequest<string, IUser>) =>
        maxLength(256)(request),
      readCheck: true,
    },

    /* Emergency Contact Info */
    emergencyContact: emergencyContact,

    /* Avatars */
    avatarBase: {
      type: Number,
      caption: 'Avatar Base',
      writeCheck: true,
      submitCheck: withinInt(0, 5),
      readCheck: true,
    },
    avatarItem: {
      type: Number,
      caption: 'Avatar Item',
      writeCheck: true,
      submitCheck: withinInt(0, 2),
      readCheck: true,
    },

    /* Your experience */
    school: {
      type: String,
      caption: 'School',
      inTextSearch: true,

      writeCheck: maxLength(256),
      submitCheck: (request: WriteCheckRequest<string, IUser>) =>
        minLength(1)(request) && maxLength(256)(request),
      readCheck: true,
    },

    program: {
      type: String,
      caption: 'Program',
      inTextSearch: true,

      writeCheck: maxLength(256),
      submitCheck: (request: WriteCheckRequest<string, IUser>) =>
        minLength(1)(request) && maxLength(256)(request),
      readCheck: true,
    },

    levelOfStudy: {
      type: String,
      caption: 'Level of study',
      inTextSearch: true,

      writeCheck: inEnum(enumOptions.levelOfStudy, true),
      submitCheck: inEnum(enumOptions.levelOfStudy),
      readCheck: true,
    },

    graduationYear: {
      type: Number,
      caption: 'Graduation Year',
      inTextSearch: true,

      writeCheck: true,
      submitCheck: withinInt(2023, 2031),
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
      submitCheck: (request: WriteCheckRequest<any, IUser>) =>
        request.targetObject?.hackerApplication?.resumeFileName?.length > 0,
    },

    // The user cannot directly edit this field, but they can view it
    // We will set this when the user updates their application
    friendlyResumeFileName: {
      type: String,
      caption: 'Resume Name',
      inTextSearch: true,

      readCheck: true,
      writeCheck: false,
      submitCheck: (request: WriteCheckRequest<any, IUser>) =>
        request.targetObject?.hackerApplication?.resumeFileName?.length > 0,
    },

    resumeSharePermission: {
      type: Boolean,
      caption:
        'I allow Hack the 6ix to distribute my resume to its event sponsors',

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

    creativeResponseEssay: {
      type: String,
      caption:
        'Tell us about a project you’ve enjoyed working on (this can be non-technical!). What made you decide to work on this project? What challenges did you face and how did you overcome them?',
      writeCheck: maxLength(3000),
      readCheck: true,
      submitCheck: (request: WriteCheckRequest<string, IUser>) =>
        minLength(1)(request) && maxLength(3000)(request),
    },

    whyHT6Essay: {
      type: String,
      caption:
        'If you could not do anything related to school, work, or coding for 4 months, what would you do and why?',
      writeCheck: maxLength(1000),
      readCheck: true,
      submitCheck: (request: WriteCheckRequest<string, IUser>) =>
        minLength(1)(request) && maxLength(1000)(request),
    },

    oneSentenceEssay: {
      type: String,
      caption:
        'You are given an elephant. You cannot sell or give away the elephant. What do you do with the elephant?',
      writeCheck: maxLength(500),
      readCheck: true,
      submitCheck: (request: WriteCheckRequest<string, IUser>) =>
        minLength(1)(request) && maxLength(500)(request),
    },

    howDidYouHearAboutHT6: {
      type: [String],
      caption: 'Where did you hear about Hack the 6ix?',
      writeCheck: multiInEnum(enumOptions.howDidYouHearAboutHT6),
      readCheck: true,
      submitCheck: multiInEnum(enumOptions.howDidYouHearAboutHT6),
    },

    previousHT6Experience: {
      type: [String],
      caption:
        'Have you previously attended or applied to Hack the 6ix? (select all that apply)',
      writeCheck: multiInEnum(enumOptions.previousHT6Experience),
      readCheck: true,
      submitCheck: multiInEnum(enumOptions.previousHT6Experience),
    },

    /* At HT6 */
    mlhCOC: {
      type: Boolean,
      caption: 'MLH COC',

      writeCheck: true,
      submitCheck: (request: WriteCheckRequest<boolean, IUser>) =>
        request.fieldValue,
      readCheck: true,
    },

    mlhEmail: {
      type: Boolean,
      caption: 'MLH Email',

      writeCheck: true,
      readCheck: true,
    },

    mlhData: {
      type: Boolean,
      caption: 'MLH Data',

      writeCheck: true,
      submitCheck: (request: WriteCheckRequest<boolean, IUser>) =>
        request.fieldValue,
      readCheck: true,
    },
  },
};

const rsvpForm = {
  writeCheck: true,
  readCheck: true,
  FIELDS: {
    selectedCompanies: {
      type: [String],
      default: [] as string[],
      caption: 'Selected companies',

      writeCheck: true,
      readCheck: true,
    },
    remindInPersonRSVP: {
      type: Boolean,
      default: false,
      caption: 'In person RSVP reminder',
      writeCheck: true,
      readCheck: true,
    },
  },
};

// Internal FIELDS; Only organizers can access them
const internal = {
  writeCheck: (request: WriteCheckRequest<any, IUser>) =>
    isOrganizer(request.requestUser),
  readCheck: (request: ReadCheckRequest<IUser>) =>
    isOrganizer(request.requestUser),

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
      writeCheck: (request: WriteCheckRequest<any, IUser>) =>
        isAdmin(request.requestUser),
      readCheck: true,

      FIELDS: {
        longEssay: {
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

        shortEssay: {
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

        oneSentenceEssay: {
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
  writeCheck: (request: ReadCheckRequest<IUser>) =>
    isOrganizer(request.requestUser),
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

      readCheck: (request: ReadCheckRequest<IUser>) =>
        isOrganizer(request.requestUser),
    },

    statusReleased: {
      type: Boolean,
      required: true,
      default: false,
      caption: 'Status Released',

      writeCheck: (request: ReadCheckRequest<IUser>) =>
        isOrganizer(request.requestUser),
      readCheck: (request: ReadCheckRequest<IUser>) =>
        isOrganizer(request.requestUser),
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
      readCheck: true,
    },

    // Virtual fields
    rsvpExpired: {
      type: Boolean,
      virtual: true,
      caption: 'RSVP Expired',

      readCheck: true,
    },

    applicationExpired: {
      type: Boolean,
      virtual: true,
      caption: 'Application Expired',

      readCheck: true,
    },

    canAmendTeam: {
      type: Boolean,
      virtual: true,
      caption: 'Can Amend Team',

      readCheck: true,
    },

    canApply: {
      type: Boolean,
      virtual: true,
      caption: 'Can Apply',

      readCheck: true,
    },

    canRSVP: {
      type: Boolean,
      virtual: true,
      caption: 'Can RSVP',

      readCheck: true,
    },

    isRSVPOpen: {
      type: Boolean,
      virtual: true,
      caption: 'Is Confirmation Open',

      readCheck: true,
    },
  },
};

// Fields to inject into mailmerge
const mailmerge = {
  readCheck: (request: ReadCheckRequest<IUser>) =>
    isOrganizer(request.requestUser),

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
  writeCheck: (request: WriteCheckRequest<any, IUser>) =>
    isUserOrOrganizer(request.requestUser, request.targetObject),
  readCheck: (request: ReadCheckRequest<IUser>) =>
    isUserOrOrganizer(request.requestUser, request.targetObject),

  deleteCheck: (request: DeleteCheckRequest<IUser>) =>
    isAdmin(request.requestUser),
  createCheck: (request: CreateCheckRequest<any, IUser>) =>
    isAdmin(request.requestUser),

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
      writeCheck: (request: WriteCheckRequest<string, IUser>) =>
        isOrganizer(request.requestUser),
    },

    idpLinkID: {
      type: String,
      required: true,
      caption: 'SAML Name ID',
      index: true,

      readCheck: false,
      writeCheck: (request: WriteCheckRequest<string, IUser>) =>
        isOrganizer(request.requestUser),
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

      writeCheck: (request: WriteCheckRequest<string, IUser>) =>
        isOrganizer(request.requestUser) && maxLength(64)(request),
      readCheck: true,
    },

    lastName: {
      type: String,
      required: true,
      caption: 'Last Name',
      inTextSearch: true,

      writeCheck: (request: WriteCheckRequest<string, IUser>) =>
        isOrganizer(request.requestUser) && maxLength(64)(request),
      readCheck: true,
    },

    email: {
      type: String,
      required: true,
      caption: 'Email',
      inTextSearch: true,

      writeCheck: (request: WriteCheckRequest<string, IUser>) =>
        isOrganizer(request.requestUser) && maxLength(64)(request),
      readCheck: true,
    },

    created: {
      type: Number,
      caption: 'Created',
      default: Date.now,

      readCheck: true,
    },
    personalRSVPDeadline: {
      type: Number,
      caption: 'RSVP Deadline',

      writeCheck: (request: WriteCheckRequest<string, IUser>) =>
        isOrganizer(request.requestUser),
      readCheck: true,
    },
    checkInQR: {
      type: String,
      readCheck: true,
    },

    // Some users (mostly for testing/won admission) are special and should be allowed to apply before everyone else
    personalApplicationOpen: {
      type: Number,
      caption: 'Personal Application Open',

      writeCheck: (request: WriteCheckRequest<string, IUser>) =>
        isOrganizer(request.requestUser),
      readCheck: true,
    },

    // Some hackers are special and want to apply after the global deadline
    personalApplicationDeadline: {
      type: Number,
      caption: 'Personal Application Deadline',

      writeCheck: (request: WriteCheckRequest<string, IUser>) =>
        isOrganizer(request.requestUser),
      readCheck: true,
    },

    // If the user has a personal deadline, it takes precedence over the global deadline
    computedApplicationOpen: {
      type: Number,
      virtual: true,
      readCheck: true,
    },
    computedApplicationDeadline: {
      type: Number,
      virtual: true,
      readCheck: true,
    },
    computedRSVPDeadline: {
      type: Number,
      virtual: true,
      readCheck: true,
    },
    checkInNotes: {
      type: [String],
      default: [] as any,
      writeCheck: (request: WriteCheckRequest<string, IUser>) =>
        isOrganizer(request.requestUser),
      readCheck: true,
    },
    checkInTime: {
      type: Number,
      caption: 'Check In Time',
      readCheck: true,
    },
    rsvpForm: rsvpForm,
    discord: discordShared,
    roles: roles,
    groups: groups,
    status: status,
    hackerApplication: hackerApplication,
    internal: internal,
    mailmerge: mailmerge,
    mailingListSubcriberID: {
      type: Number,
      required: false,
      caption: 'Mailing List Subcriber ID',

      writeCheck: (request: WriteCheckRequest<string, IUser>) =>
        isOrganizer(request.requestUser) && maxLength(64)(request),
      readCheck: true,
    },

    /**
     * This is a special field used to allow the settings document mapped to every
     * user for the purposes of populating virtual fields.
     */
    settingsMapper: {
      type: Number,
      default: 0,
      required: true,
    },
  },
};

export interface IRoles {
  // Virtual field with all "lesser" roles populated
  hacker: boolean;
  admin: boolean;
  organizer: boolean;
  volunteer: boolean;
}

export interface IStatus {
  statusReleased?: boolean;
  applied?: boolean;
  accepted?: boolean;
  rejected?: boolean;
  waitlisted?: boolean;
  confirmed?: boolean;
  declined?: boolean;
  checkedIn?: boolean;

  // Virtual fields
  canAmendTeam?: boolean;
  canApply?: boolean;
  canRSVP?: boolean;
  isRSVPOpen?: boolean;

  rsvpExpired?: boolean;
  applicationExpired?: boolean;

  textStatus: string;
  internalTextStatus: string;
}

export interface IUser extends BasicUser {
  lastLogout: number;
  idpLinkID: string;
  fullName: string;
  created: number;
  personalApplicationOpen?: number;
  personalRSVPDeadline?: number;
  personalApplicationDeadline?: number;
  roles: IRoles;
  groups: IRoles; // Raw group from KEYCLOAK
  status: IStatus;
  hackerApplication: IApplication;
  rsvpForm: IRSVPForm;
  internal: {
    notes?: string;
    computedApplicationScore?: number;
    computedFinalApplicationScore?: number; // This value is added by get-rank and usually isn't populated
    applicationScores?: {
      longEssay: {
        score: number;
        reviewer: string;
      };
      shortEssay: {
        score: number;
        reviewer: string;
      };
      oneSentenceEssay: {
        score: number;
        reviewer: string;
      };
      project: {
        score: number;
        reviewer: string;
      };
      portfolio: {
        score: number;
        reviewer: string;
      };
    };
  };
  mailmerge: IMailMerge;
  computedApplicationOpen: number;
  computedApplicationDeadline: number;
  computedRSVPDeadline: number;
  mailingListSubcriberID?: number;
}

export interface IMailMerge {
  FIRST_NAME: string;
  LAST_NAME: string;
  MERGE_FIRST_NAME: string;
  MERGE_LAST_NAME: string;
  MERGE_APPLICATION_DEADLINE: string;
  MERGE_CONFIRMATION_DEADLINE: string;
}

export interface IApplication {
  lastUpdated: number;
  teamCode: string;
  emailConsent: boolean;
  phoneNumber: string;
  age: number;
  gender: string;
  ethnicity: string;
  country: string;
  shirtSize: string;
  dietaryRestrictions: string;
  city: string;
  province: string;
  school: string;
  program: string;
  levelOfStudy: string;
  graduationYear: number;
  hackathonsAttended: string;
  resumeFileName: string;
  friendlyResumeFileName: string;
  resumeSharePermission: boolean;
  githubLink: string;
  portfolioLink: string;
  linkedinLink: string;
  creativeResponseEssay: string;
  whyHT6Essay: string;
  oneSentenceEssay: string;
  howDidYouHearAboutHT6: string[];
  previousHT6Experience: string[];
  mlhCOC: boolean;
  mlhEmail: boolean;
  mlhData: boolean;
  emergencyContact: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    relationship: string;
  };
  avatarBase: number;
  avatarItem: number;
}

export type IPartialApplication = Partial<IApplication>;

export interface IRSVPForm {
  selectedCompanies?: string[];
  remindInPersonRSVP?: boolean;
}
