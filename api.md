# Hack the 6ix API Documentation

Unless otherwise stated, request fields are (probably) optional.

Also, pretend that the JSON is valid :) I left out some double quotes to make it a bit more cleaner.

In general, APIs will respond in the following format:

```
{
  status: <status code>,
  message: <main payload>
}
```

## API - General Object Operations

### POST - Get Object (Organizer)

`/api/get/:objectType`

Get the result of a search query for any object type. Queries are checked against `readCheck` policy.

##### Input Specification

`objectType` refers to the name of the object being operated on (duh).

The API requires the object type passed in as a query parameter. Additionally, a search query must be specified in the body of the request.

```
{
  page: 1, // Required - 1 indexed page number to fetch
  size: 20, // Required - Number of objects per page
  sortCriteria: "asc", // Can be asc or desc
  sortField: "profile.internal.applicationScore", // Path to field to use for sort
  text: "Banana", // Is added as an "OR" filter
  filter: { // Any additional manual filters
    "$or": [ // If any of these expressions are true, then there's a match
      { baz: "bar" },
      { bang: "pang" },
    ],
    "$and": [ // All these expressions need to be true
      { lastName: "foo" },
      { firstName: "baz", bop: "beep" },
    ],
    beep: "boop", // Statements like this on the top level also need to be true
    internal: {
      notes: "trash" // Nested field (note this is different than the boo.bap example as internal must match this map exactly)
    },
    "boo.bap": "reee"
  }
}
```

##### Output Specification

The API will return an array of maps corresponding to the queried object.
Note that the number of items returned may not match the limit specified in the query if some objects were
filtered out as part of field sanitation.

```
{
  status: 200,
  message: [
    {
       ...results1
    },
    {
       ...results2
    }
  ]
}
```

### POST - Edit Object (Organizer)

`/api/edit/:objectType`

Edit existing objects. Changes are validated against `writeCheck` policy.

WARNING! This is an **EXTREMELY** dangerous operation! If the query is incorrect, it could potentially break the database.
Remember that `{}` means match **EVERYTHING**.

##### Input Specification

`objectType` refers to the name of the object being operated on (duh).

```
{
  filter: { // All objects that match this filter (mongoDB format) will be affected
     _id: 12345
  },
  changes: { // Changes to apply to the object (mongoDB format)
    firstName: "foobar"
  },
  noFlatten: false // if true, the changes will REPLACE rather than merge
}
```

##### Output Specification

```
{
  status: 200,
  message: [ // IDs of objects that were changed
    "id1234",
    "id1235",
    ...
  ]
}
```

### POST - Delete Object (Admin)

`/api/delete/:objectType`

Delete existing objects. Changes are validated against `deleteCheck` policy.

WARNING! This is an **EXTREMELY** dangerous operation! If the query is incorrect, it could potentially nuke the database.
Remember that `{}` means match **EVERYTHING**.

##### Input Specification

`objectType` refers to the name of the object being operated on (duh).

All objects that match the filter query will be deleted.

```
{ // The entire body is the mongoDB filter query
  _id: 12345,
  firstName: "foobar",
  ...
}
```

##### Output Specification

WARNING! This is an **EXTREMELY** dangerous operation! If the query is incorrect, it could potentially nuke the database.
Remember that `{}` means match **EVERYTHING**.

```
{
  status: 200,
  message: [ // IDs of objects that were deleted
    "id1234",
    "id1235",
    ...
  ]
}
```

### POST - Create Object (Admin)

`/api/create/:objectType`

Create new object. Requests are validated against `createCheck` and `writeCheck` policy.

##### Input Specification

`objectType` refers to the name of the object being operated on (duh).

Note that all inputs will be validated using `writeCheck`.

```
{ // Initial values for the new object
  firstName: "test",
  lastName: "bar",
  ....
}
```

##### Output Specification

```
{
  status: 200,
  message: "id1234" // ID of the new object is returned
}
```

### POST - Initialize settings mapper (Admin)

`/api/action/initializeSettingsMapper`

Iterates through all documents and ensures the settingsMapper field is populated.
We use this field to populate the user object with data from global settings, such as deadlines.
Refer to the README for more information.

This endpoint should only be needed for migrating old databases.

##### Output Specification

```
{
  status: 200,
  message: "ok"
}
```

### GET - Get file from Azure Blob Storage (Organizer)

`/api/blob?container=<container>&blobName=<blobName>`

Fetch a file stored in Azure Blob Storage given its container and blob name.

##### Input Specification

Specify the `container` and `blobName` of the file to be fetched as query parameters.
Valid containers are: `resumes`.

##### Output Specification

The queried file will be returned if successful.

### GET - Get presigned download URL for Azure Blob Storage (Organizer)

`/api/blob/download-url?container=<container>&blobName=<blobName>&expiresInMinutes=<minutes>`

Get a temporary URL to download a file from Azure Blob Storage.

##### Input Specification

Specify the `container` and `blobName` of the file to be fetched as query parameters.
Valid containers are: `resumes`.
`expiresInMinutes` is an optional parameter to specify the validity duration of the URL in minutes (default is 60).

##### Output Specification

```
{
  status: 200,
  message: "<presigned download url>"
}
```

### PUT - Write file to Azure Blob Storage (Organizer)

`/api/blob?container=<container>&blobName=<blobName>`

Upload a file to Azure Blob Storage.

##### Input Specification

Specify the `container` and `blobName` as query parameters and submit the file to be uploaded with the name "file".
Valid containers are: `resumes`.

For example, a file can be manually added by running:

```bash
http --form put localhost:3005/api/blob?container=resumes&blobName=myresume.pdf file@file.pdf x-access-token:$TOKEN
```

##### Output Specification

```
{
    "message": "Success",
    "status": 200
}
```

### GET - Get presigned upload URL for Azure Blob Storage (Organizer)

`/api/blob/upload-url?container=<container>&blobName=<blobName>&expiresInMinutes=<minutes>`

Get a temporary URL to upload a file to Azure Blob Storage. This is useful for client-side uploads.

##### Input Specification

Specify the `container` and `blobName` of the file to be uploaded as query parameters.
Valid containers are: `resumes`.
`expiresInMinutes` is an optional parameter to specify the validity duration of the URL in minutes (default is 60).

##### Output Specification

```
{
  status: 200,
  message: "<presigned upload url>"
}
```

### DELETE - Delete file from Azure Blob Storage (Organizer)

`/api/blob?container=<container>&blobName=<blobName>`

Delete a file from Azure Blob Storage given its container and blob name.

##### Input Specification

Specify the `container` and `blobName` of the file to be deleted as query parameters.
Valid containers are: `resumes`.

##### Output Specification

```
{
    "message": "Success",
    "status": 200
}
```

Error 404 will be returned if the file is not found.

## Action - Operations for specific object types

### GET - Get hacker profile (Hacker)

`/api/action/profile`

Get the sanitized user object corresponding to the requesting user.

#### Output Specification

```
{
  status: 200,
  message: {
    // User object goes here
  }
}
```

### POST - Update Application (Hacker)

`/api/action/updateapp`

Update the hacker application

#### Input Specification

```
{
  submit: true, // Whether to mark the application for submission
  application: {
    // Application content goes here
  }
}
```

#### Output Specification

```
{
  status: 200,
  message: "Success"
}
```

On failure:

```
{
  status: 403,
  message: ["firstName", "lastName"] // Return an array of fields that failed validation
}
```

### PUT - Update Resume (Hacker)

`/api/action/updateresume`

#### Input Specification

Send the resume file with the name field `resume` and magic will happen!

### GET - Get application enums (Hacker)

`/api/action/applicationEnums`

#### Output Specification

Dictionary of fields with enums and an array of valid values.

### POST - Create Team

`/api/action/createTeam`

Create a new team and add the user to it.

#### Output Specification

```
{
  status: 200,
  message: {
    code: "teamcode goes here",
    memberNames: [
      "Bill Gates"
    ]
  }
}
```

### POST - Join Team

`/api/action/joinTeam`

Join an existing team if there is room.

#### Input Specification

```
{
  teamCode: "teamcodegoeshere"
}
```

#### Output Specification

```
{
  status: 200,
  message: {
    code: "teamcodegoeshere",
    memberNames: [
      "Bill Gates"
    ]
  }
}
```

### POST - Leave Team

`/api/action/leaveTeam`

Remove the user from their team, and delete it if they were the last user.

#### Output Specification

```
{
  status: 200,
  message: "Success"
}
```

### GET - Get Team

`/api/action/getTeam`

Get the user's current team

#### Output Specification

```
{
  status: 200,
  message: {
    code: "teamcodegoeshere",
    memberNames: [
      "Bill Gates"
    ]
  }
}
```

### GET - Get Application Settings

`/api/action/applicationSettings`

Returns the global settings object

#### Output Specification

```
{
  status: 200,
  message: {
    ...
  }
}
```

### POST - Generate Discord OAuth URL

`/api/action/discordOAuthUrl`

Returns a URL to begin the Discord OAuth process.

#### Input Specification

```
{
 redirectUrl: "<string>"
}
```

#### Output Specification

```
{
  status: 200,
  message: "<url>"
}
```

### POST - Associate Discord

`/api/action/discordOAuthUrl`

Finishes the Discord OAuth process and associates the user, given a state and code.

#### Input Specification

```
{
 state: "<string>",
 code: "<code>"
}
```

#### Output Specification

```
{
  status: 200,
  message: "OK"
}
```

### GET - Get statistics

`/api/action/getStatistics?update=false`

#### Input Specification

Change `update` in the query string to `true` if the most up to date statistics are required immediately.
This will also update the cache, which by default has a lifetime of 5 minutes.

#### Output Specification

```
{
  status: 200,
  message: {
    ...stats go here, look at src/services/statistics.ts for the full typedef
  }
}
```

### POST - Sync Mailing Lists

`/api/action/syncMailingLists`

Trigger a mailing list sync with ListMonk.

#### Input Specification

```
{
  mailingList: <array of name of mailing list to sync> (all if omitted),
}
```

#### Output Specification

```
{
  status: 200,
  message: [
    ... // list of all mailing lists synced
  ]
}
```

### POST - Sync User Mailing Lists

`/api/action/syncUserMailingLists`

Trigger a mailing list sync with ListMonk for a particular user.

#### Output Specification

```
{
  status: 200,
  message: "Success"
}
```


### POST - Verify Mailing List

`/api/action/verifyMailingList`

This will add a user to every registered mailing list with the (expected)
name of the mailing list in their email.

This can be used to verify that the correct list ID was used; however,
it does NOT verify that the query is correct.

The request user's mail merge will be used for all of the test users.

#### Output Specification

```
{
  status: 200,
  message: [
    // list of the names of mailing lists that were verified
  ]
}
```

### POST - Send a singular email

`/api/action/sendEmail`

Send an email to a user using the ListMonk transactional API. If `email` corresponds to a user registered
in the system, tags will automatically be injected with information such as application deadline, confirmation deadline, etc.

#### Input Specification

```
{
  email: <email of the recipient>
  templateName: <name of the template to send>
  tags: <dictionary of tags to inject for mailmerge>
}
```

#### Output Specification

```
{
  status: 200,
  message: "Success"
}
```

### POST - Send email template tests

`/api/action/templateTest`

Send the requester an instance of every available email template to ensure everything looks correct.
This endpoint should be called after configuring the server to ensure that the correct template IDs
were used, and that all the mail merges were successful.

In the email, each mail merge field should be replaced by something that looks like `<<<FIELD goes here>>>`,
where `FIELD` is the name of the field it is replacing. Ensure that `FIELD` matches what you expect should be filled
in that spot.

#### Output Specification

```
{
  status: 200,
  message: [
    // List of template names that were sent
  ]
}
```

### POST - Release Application Status

`/api/action/releaseApplicationStatus`

Set application released status to true for all users who have been either waitlisted, accepted, or rejected

#### Output Specification

```
{
  status: 200,
  message: [
    // List of users who were updated
  ]
}
```

### GET - Get ranks

`/api/action/getRanks?usePersonalScore=<true | false>`

Since application scores are a computed value, we cannot sort them in our query. Instead, we will
have to use this dedicated endpoint to have it sorted manually.

#### Input Specification

`usePersonalScore` can be optionally passed in the query string to alter the metric used to order the users.
By default, users are ordered by their `computedFinalApplicationScore`, which is the max of their personal
score and their team's score.

#### Output Specification

```
{
  status: 200,
  message: [
    // List of users who have been scored and graded, in descending order
    // NOTE: To reduce the computational load, these users will be fetched directly
    //       from MongoDB and thus not go through the usual read/write checks + interceptors
  ]
}
```

### POST - Assign Application Status

`/api/action/assignApplicationStatus`

Assign the application status to users using the grading algorithm. The top n applicants (where n is
the maximum number of accepted users) are assigned the accepted role, and the next m applicants (where
m is the maximum number of waitlisted users) are assigned the waitlisted role. All remaining users
who applied are rejected.

**Warning**: Once this action has executed and people are accepted, their spots will be reserved until
it expires or it is manually revoked. Be very careful and ensure that everyone is graded
prior to running this!

#### Input Specification

`legit` can be used to indicate whether or not the changes will be
actually written to the database. If `legit` is not `true`, then it will essentially give a "preview"
into what the list would look like.

`waitlistOver` can be set `true` to reject all users that would otherwise be waitlisted / are on the waitlist
currently.

`waitlistDeadline` will be used to set the confirmation deadline for users who were moved off the waitlist.
By default, this will be the system waitlist accepted confirmation deadline.

```
{
  legit: <true|false>, // default false
  waitlistOver: <true|false>, // default false
  waitlistDeadline: <unix timestamp> // default disabled
}
```

#### Output Specification

```
{
  status: 200,
  message: {
    "accepted": [
      // Users
    ],
    "waitlisted": [
      // Users
    ],
    "rejected": [
      // Users
    ],
    "dead": [
      // Users
    ]
  }
}
```

### POST - Update RSVP

`/api/action/rsvp`

This endpoint is used to update a user's RSVP status. A user may only RSVP if they are accepted, not previously declined, and are in the RSVP period (whether global or personal).
Once a user has declined, they cannot retract this decision.

#### Input Specification

```
{
  "attending": true // false if they are not attending... duh,
  "form": {
    // RSVP form responses go here
  }
}
```

#### Output Specification

```
{
  status: 200,
  message: "Success"
}
```

### GET - Get candidate (Organizer)

`/api/action/getCandidate?category=<category goes here>`

Fetch a random applicant that hasn't been graded yet.

#### Input Specification

`category` can be optionally specified as a query parameter to only return candidates
who are ungraded in that category. If left blank, no category will be prioritized.

#### Output Specification

```
{
  status: 200,
  message: {
    // User object goes here
  }
}
```

### POST - Grade candidate (Organizer)

`/api/action/gradeCandidate`

Assign a grade to a user in a particular category. The submitted grades will override any existing
ones and the dictionary will be merged (so omitted fields are unchanged).

#### Input Specification

```
{
  "candidateID": <id of user to grade>,
   "grades": {
     <category name>: <grade to assign the user>,
     ... // multiple categories can be graded simultaneously, if needed
   }
}
```

#### Output Specification

```
{
  status: 200,
  message: "Success"
}
```

### POST - Verify a Discord user (Organizer)

`/api/action/verifyDiscord`

Attempt to associate a user with a given Discord account. Will fail if the user does not exist or is already bound to another Discord account.

#### Input Specification

```
{
  "email": <email of the user>,
  "discordID": <Discord account ID>,
  "discordUsername": <Discord account username (not checked, for display only)>
}
```

#### Output Specification

```
{
  status: 200,
  message: {
    firstName: <first name of the user>,
    lastName: <last name of the user>,
    email: <email of the user>,
    suffix: <Discord suffix of the user> (optional),
    roles: [
      <user Discord roles>
    ]
  }
}
```

The user's Discord roles is taken from the user's permission roles as well as any in their `discord.additionalRoles` field.

### GET - Resume Export (Organizer)

`/api/action/resumeExport`

Returns a ZIP of all the resumes of users who were accepted or waitlisted and consented to their resume being shared.

#### Output Specification

Binary blob

### POST - Disassociate Discord (Organizer)

`/api/action/disassociateDiscord`

Disassociates a user from their associated Discord account.

#### Input Specification

```
{
 userID: "<userID>"
}
```

#### Output Specification

```
{
  status: 200,
  message: "OK"
}
```

### GET - Get user Discord Metadata (Organizer)

`/api/action/disassociateDiscord`

Returns the application's metadata that is stored by Discord.

#### Input Specification

```
{
 userID: "<userID>"
}
```

#### Output Specification

```
{
  status: 200,
  message: {
    ...
  }
}
```

### GET - Get next queued Discord verification (Organizer)

`/api/action/getNextQueuedDiscordVerification`

Returns information about the next user that is in the Discord server verification queue. Note that this also removes the entry from the queue.

#### Output Specification

```
{
  status: 200,
  message: {
    ...
  }
}
```

### POST - Requeue Discord verification (Organizer)

`/api/action/requeueDiscordVerification`

Requeue a Discord verification request.

#### Input Specification

```
{
  queuedVerificationID: "<queueVerificationID>",
  earliestRetryAt: "<unix time (ms)>"
}
```

#### Output Specification

```
{
  status: 200,
  message: ""
}
```

### POST - Add Check In Notes (Organizer)

`/api/action/addCheckInNotes`

Adds the given check in notes to a user's check in notes. Returns all the user's new check in notes.

#### Input Specification

```
{
  userID: "<userID>",
  checkInNotes: ["<string>"]
}
```

#### Output Specification

```
{
  status: 200,
  message: ["<string>"]
}
```

### POST - Remove Check In Notes (Organizer)

`/api/action/removeCheckInNotes`

Remove the given check in notes to a user's check in notes. Returns all the user's new check in notes.

#### Input Specification

```
{
  userID: "<userID>",
  checkInNotes: ["<string>"]
}
```

#### Output Specification

```
{
  status: 200,
  message: ["<string>"]
}
```

### GET - Check in QR Code

`/api/action/checkInQR`

Returns a data URI with the user's check in code.

#### Output Specification

```
{
  "status": 200,
  "message": "<base64-encoded image>"
}
```

### POST - Check in user (Volunteer)

`/api/action/checkIN`

Checks in a (External) User.

##### Input Specification

```
{
  "userID": "<userID>",
  "userType": "<User|ExternalUser>"
}
```

#### Output Specification

```
{
  "status": 200,
  "message": false|[<Check-In Notes>]
}
```

### POST - Generate check in QR codes for multiple (External) Users (Organizer)

`/api/action/multiCheckInQR`

Generates check in QR codes for multiple (external) users.

##### Input Specification

```
{
  "userList": [{
      "userID": "<userID>",
      "userType: "<User|ExternalUser>"
    }]
}
```

#### Output Specification

```
{
  "status": 200,
  "message": [{
      "userID": "<userID>",
      "userType": "<User|ExternalUser>"
      "code": "<base64-encoded image>"
  }]
}
```

### POST - Create API Token (Admin)

`/api/action/createAPIToken`

Generates an API token that can be used to access the API programmatically.

##### Input Specification

```
{
  "groups": ["<hacker|volunteer|organizer|admin>"],
  "description": "<string>"
}
```

#### Output Specification

```
{
  "status": 200,
  "message": [{
      "token": "<token>",
  }]
}
```

## Auth - Authentication related operations

### POST - Starting point for login

`/auth/:provider/login`

##### Input Specification

`provider` refers to the name of the OpenID provider being operated on.

```
{
  "redirectTo": "<url to redirect the user to after authentication>", // the redirect is handled by frontend
  "callbackURL": "<url of the OpenID callback endpoint>" // will default to provider.callback_url
}
```

`callbackURL` should be set to the OpenID callback endpoint on the frontend. The frontend callback should then POST the code and state query parameters to the callback endpoint on the backend to retrieve the JWTs.
(e.g. `dash.hackthe6ix.com/callback`, will direct the user to the main app after getting the tokens)

`redirectTo` is simply passed to the callback endpoint on the frontend. Generally it will be where the user is redirected to after the JWTs are retrieved and the session is started.

##### Output Specification

```
{
  "status": 200,
  "message": {
    "url": "<url to redirect the user to to begin auth flow>"
  }
}
```

The flow state will be set to a JSON string. The callback URL is stored in the `callbackURL` property and the redirect URL is stored in the `redirectTo` property.

### POST - Assert endpoint for when login completes

`/auth/:provider/callback`

##### Input Specification

`provider` refers to the name of the OpenID provider being operated on.

```
{
  "code": "<OpenID authorization code>",
  "state": "<the flow state>"
}
```

##### Output Specification

```
{
  "status": 200,
  "message": {
    "token": "<backend access token>",
    "refreshToken": "<OpenID refresh token>",
    "redirectTo": "<the url to redirect the user to> (optional)"
  }
}
```

### POST - Refresh Token

`/auth/:provider/refresh`

##### Input Specification

`provider` refers to the name of the OpenID provider being operated on.

```
{
  "refreshToken": "<refresh token goes here>"
}
```

##### Output Specification

```
{
  status: 200,
  message: {
    token: ...,
    refreshToken: ...
  }
}
```

### POST - Destroy the session

`/auth/:provider/logout`

##### Input Specification

`provider` refers to the name of the OpenID provider being operated on.

```
{
  "refreshToken": "<refresh token goes here>"
}
```

##### Output Specification

```
{
  "status": 200
}
```

## NFC - NFC Badge Operations

### POST - Assign NFC to User

`/nfc/assign`

Assigns an NFC ID to a specific user.

#### Input Specification

```
{
  "nfcId": "<nfc identifier>",
  "userId": "<user identifier>"
}
```

#### Output Specification

```
{
  "status": 200,
  "message": "NFC assigned successfully"
}
```

### GET - Get User ID from NFC ID

`/nfc/getUserId/:nfcId`

Retrieves a user ID associated with the given NFC ID.

#### Output Specification

```
{
  "status": 200,
  "userId": "<user identifier>"
}
```

### GET - Get User from NFC ID

`/nfc/getUser/:nfcId`

Retrieves the complete user object associated with the given NFC ID.

#### Output Specification

```
{
  "status": 200,
  "user": {
    // User object goes here
  }
}
```

### DELETE - Delete NFC Assignment by NFC ID

`/nfc/deleteAssignmentByNfc/:nfcId`

Removes the association between an NFC ID and user.

#### Output Specification

```
{
  "status": 200,
  "message": "NFC assignment deleted successfully"
}
```

### DELETE - Delete NFC Assignment by User ID

`/nfc/deleteAssignmentByUser/:userId`

Removes any NFC assignments for the specified user.

#### Output Specification

```
{
  "status": 200,
  "message": "NFC assignment deleted successfully"
}
```

### POST - Update Check-ins Using NFC

`/nfc/updateCheckInsFromNFC`

Updates specific check-in events for a user identified by NFC ID.

#### Input Specification

```
{
  "nfcId": "<nfc identifier>",
  "checkInEvent": "<event name>",
  "value": "<check-in value>"
}
```

Valid check-in events (placeholder):

- hackerCheckIn
- lunchOne
- dinnerOne
- eventOne
- snackOne
- lunchTwo
- dinnerTwo

#### Output Specification

```
{
  "status": 200,
  "response": {
    // Response details
  }
}
```
