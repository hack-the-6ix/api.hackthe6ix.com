/* Permissions */

import { WriteCheckRequest } from '../types/checker';
import { UniverseState } from '../types/types';
import { deadlinesOverrides, LAST_SECOND_OF_CENTURY } from '../consts';
// Admins can do anything and bypass validation
import { IUser } from './user/fields';

export const canUserOverrideDeadlines = (
  requestUser: IUser,
  overrides?: string[],
) => {
  const userEmail = requestUser.email.toLowerCase();

  if (overrides === undefined) {
    overrides = deadlinesOverrides;
  }

  for (const rule of overrides) {
    if (rule.charAt(0) === '@' && userEmail.endsWith(rule)) {
      return true;
    } else if (userEmail === rule) {
      return true;
    }
  }

  return false;
};

export const isAdmin = (requestUser: IUser) => requestUser.roles.admin;
export const isOrganizer = (requestUser: IUser) => requestUser.roles.organizer;
export const isVolunteer = (requestUser: IUser) => requestUser.roles.volunteer;
export const isUser = (requestUser: IUser, targetUser: IUser) =>
  requestUser._id && requestUser._id.equals(targetUser._id);

export const isUserOrOrganizer = (requestUser: IUser, targetUser: IUser) =>
  isOrganizer(requestUser) || isUser(requestUser, targetUser);

/* Value properties */
export const isInt = (request: WriteCheckRequest<string | any[], any>) =>
  Number.isInteger(request.fieldValue);
export const withinInt =
  (min: number, max: number) =>
  (request: WriteCheckRequest<string | any[], any>) =>
    maxInt(max)(request) && minInt(min)(request);
export const maxInt =
  (num: number) => (request: WriteCheckRequest<string | any[], any>) =>
    isInt(request) && parseInt(request.fieldValue.toString()) <= num;
export const minInt =
  (num: number) => (request: WriteCheckRequest<string | any[], any>) =>
    isInt(request) && parseInt(request.fieldValue.toString()) >= num;
export const maxLength =
  (maxLength: number) => (request: WriteCheckRequest<string | any[], any>) =>
    !request.fieldValue || request?.fieldValue.length <= maxLength;
export const minLength =
  (minLength: number) => (request: WriteCheckRequest<string | any[], any>) =>
    request.fieldValue && request?.fieldValue.length >= minLength;

export const maxWordLength =
  (maxLength: number) => (request: WriteCheckRequest<string, any>) =>
    !request.fieldValue || request?.fieldValue?.split(' ').length <= maxLength;
export const minWordLength =
  (minLength: number) => (request: WriteCheckRequest<string, any>) =>
    request.fieldValue && request?.fieldValue?.split(' ').length >= minLength;

// Validate that all selections are valid
export const multiInEnum =
  (validStates: string[]) => (request: WriteCheckRequest<string[], any>) => {
    for (const x of request?.fieldValue || []) {
      if (validStates.indexOf(x) == -1) {
        return false;
      }
    }

    return true;
  };

/**
 * @param validStates
 * @param unstrict - when true, falsy values will pass the test
 */
export const inEnum =
  (validStates: string[], unstrict?: boolean) =>
  (request: WriteCheckRequest<string, any>) =>
    (unstrict && !request?.fieldValue) ||
    validStates.indexOf(request?.fieldValue) != -1;

export const validatePostalCode =
  () => (request: WriteCheckRequest<string, any>) =>
    !!request.fieldValue?.match(
      /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i,
    );

/* State validators */

export const isApplied = (user: IUser) => user?.status?.applied;
export const isDeclined = (user: IUser) => user?.status?.declined;
export const isAccepted = (user: IUser) => user?.status?.accepted;
export const isStatusReleased = (user: IUser) => user?.status?.statusReleased;
export const rsvpDecisionSubmitted = (user: IUser) =>
  user?.status?.confirmed || user?.status?.declined;

// NOTE: Personal deadlines will override global deadlines if they are set.
export const getApplicationOpen = (user: IUser, universeState: UniverseState) =>
  canUserOverrideDeadlines(user)
    ? 0
    : user.personalApplicationOpen === undefined
    ? universeState.public.globalApplicationOpen
    : user.personalApplicationOpen;
export const getApplicationDeadline = (
  user: IUser,
  universeState: UniverseState,
) =>
  canUserOverrideDeadlines(user)
    ? LAST_SECOND_OF_CENTURY
    : user.personalApplicationDeadline === undefined
    ? universeState.public.globalApplicationDeadline
    : user.personalApplicationDeadline;
export const getRSVPDeadline = (user: IUser, universeState: UniverseState) =>
  canUserOverrideDeadlines(user)
    ? LAST_SECOND_OF_CENTURY
    : user.personalRSVPDeadline === undefined
    ? universeState.public.globalConfirmationDeadline
    : user.personalRSVPDeadline;

export const isApplicationOpen = (user: IUser) => {
  const now = new Date().getTime();
  return (
    user.computedApplicationDeadline >= now &&
    user.computedApplicationOpen <= now
  );
};
export const isRSVPOpen = (user: IUser) =>
  user.computedRSVPDeadline >= new Date().getTime();

export const canUpdateApplication = (user: IUser) =>
  !isApplied(user) && !isApplicationExpired(user);

export const canRSVP = (user: IUser) =>
  !isDeclined(user) &&
  !isRSVPExpired(user) &&
  isAccepted(user) &&
  isStatusReleased(user);

export const isRSVPExpired = (user: IUser) =>
  isStatusReleased(user) &&
  isAccepted(user) &&
  !rsvpDecisionSubmitted(user) &&
  !isRSVPOpen(user);

export const isApplicationExpired = (user: IUser) =>
  !isApplied(user) && !isApplicationOpen(user);
