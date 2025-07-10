# Hack the 6ix Backend

View [API Documentation](api.md) for a detailed breakdown of the API.

## TODO
- Currently RSVP and Confirmation are kinda used interchangeably. To be more precise, it should be RSVP.

## Setup

#### Docker
Note that if this repo is private, the curl may not work correctly and will instead require an alternate
method of downloading `docker-compose.yml`.

```bash
$ mkdir -p backend/data/backend-files/config
$ cd backend
$ curl -O https://raw.githubusercontent.com/hack-the-6ix/hackthe6ix-backend/main/docker-compose.yml 
$ # Go setup mailer and authentication as detailed below in data/backend-files/config
$ # Go set up the .env file and place it in backend
$ docker-compose up -d
```
The server should be up and running on https://localhost:6971, or whatever is configured in `.env`.

In `.env`, set `DATABASE` to `mongodb://mongo:27017/ht6-backend` to use the MongoDB instance hosted
together with the backend.

#### Bootstrap
The backend does not work properly work on an empty database. Namely, mailer and authentication settings aren't present. 

We use configuration files under `config` to set up the database. If you are using the Docker container, the bootstrap script always runs on startup and checks if the database is set up. If not, it will search for the JSON configuration in the config directory and populate the settings from there. If the env variable `USE_AZURE_CONTAINER_INIT` is set, it will try to use the Azure storage account credentials `AZURE_STORAGE_CONNECTION_STRING` to read the JSON files in the container whose name is the value of `USE_AZURE_CONTAINER_INIT`.

If you are not using Docker, you should run the `start:bootstrap` npm script.

**Hack the 6ix members:** you can manage our bootstrap configuration files in the [backend-initfiles repository](https://github.com/hack-the-6ix/backend-initfiles).

#### Mailer
We are using listmonk (https://github.com/knadh/listmonk) to handle mailing lists and 
general email sending. As such, you should have an instance running prior to starting the backend,
otherwise emails won't work.

Setup `.env` with the listmonk root path (in our case `https://lists.hackthe6ix.com`) and username and password.
You must also configure email templates and mailing lists before the server can be started. Copy `config/mailer.json.example` to `config/mailer.json` and populate the placeholder fields with the relevant 
data.

**NOTE: In development mode, ALL EMAILS will land in `dev_logs` instead of being actually sent**

#### Authentication
You will also need to configure SSO authentication. Copy `config/settings.json.example` to `confing/settings.json`and configure the settings as desired.
For certificates, you must encode the PEM certificate (with headers) to base64. Note that you can add as many providers as desired, the given ones are there as examples.


Note: You must clear the settings collection in the database for the SAML settings to be updated from the bootstrap config.

#### Logging

We use Winston as our logger to stdout. In our Azure Container apps deployment, stdout is automatically loaded into Log Analytics.

### Development
```
npm install
npm run build
npm start
```

In development mode, all emails will be written to disk instead of actually sent. They can be found under
`dev_logs`. In addition, mailing list sync details are also available here.

## Architecture

### Permission System

Users are assigned groups (which are embedded in OIDC token) which determine what they can do.
By default, there are 4 roles:

| Role        | Description     |
| ----------- |:-------------|
| Hacker      | Hacker stuff | 
| Volunteer   | Barebones permissions for checking in user (Currently not really used)      |
| Organizer   | General organizer stuff like reviewing applications, etc.      |
| Admin       | Full system access      |

### Settings Mapper

There are some cases where we need to access data from the settings document from a user (e.g. computing
deadlines, etc.) However, due to limitations with mongoose, it doesn't seem possible to make an arbitrary query.
Instead, it requires a matching field between the two documents, so we have a `settingsMapper` field, which is a
dummy field just for this purpose.

### Object management

This system was designed to handle data as general as possible. As such, validation and access is
governed through a system of tester functions embedded in the models.

Although this technically works, I'm sure there are better ways of doing things (such as using mongoose hooks).

#### Schema Structure
```typescript
{
  // Rule here says that only organizers can read, delete, and create, but anyone is allowed to write
  readCheck: (request: ReadCheckRequest<ObjectType>) => request.requestUser.jwt.roles.organizer,
  writeCheck: true,
  
  // NOTE: These checks are ONLY performed on the top level
  deleteCheck: (request: DeleteCheckRequest<ObjectType>) => request.requestUser.jwt.roles.organizer,
  createCheck: (request: CreateCheckRequest<ObjectType>) => request.requestUser.jwt.roles.organizer,
  
  fields: {
    field1: {
      type: String,
      
      // These rules are applied on top of the rules from the higher scope
      
      // The read will only succeed if the user has a uid of 1234, and 
      fieldValue
      readCheck: (request: ReadCheckRequest<ObjectType>) => request.requestUser.jwt.uid == 1234,
      writeCheck: (request: WriteCheckRequest<FieldType, ObjectType>) => request.value.length < 5, 
    }
  }
}
```
On each nested level of the schema, `readCheck` and `writeCheck` rules should be specified. The fields
for that level should be in a map under the key `fields`. The controller will be expecting this structure for all read/write operations.

On `read`, `write`, `create`, and `delete` operations, `readCheck`, `writeCheck`, `createCheck`, and `deleteCheck` are called with a `ModelRequest` object respectively.
To be safe, the return value is presumed to be `false` unless explicitly stated otherwise.

**createCheck and deleteCheck are ONLY checked on the top level!**

The request object passed into the tester function is defined in `src/types/types.ts` and generally contains the user objects of the
requester and target user. For write operations, the new value for the field is also provided.

When a `read` check returns `false`, there will be no error. Instead, the relevant field(s) will simply be omitted from the results.
On the other hand, when a `write` or `delete` operation fails, the entire request will be rejected and terminated. Reading is more of a passive action, whereas
writing is active.

#### Read/Write Interceptors

### NOTE: It is recommended to use virtual fields rather than read interceptors when possible
Read interceptors are only applied when using `getObject` whereas virtual fields are almost always
populated.

### NOTE: WRITE INTERCEPTORS ARE NOT CURRENTLY IMPLEMENTED!

Sometimes it's nice to be able to swap fields as its being read/write. Interceptors allow for this kind of logic to be integrated into
the schema and dynamically loaded. If no interceptors are specified, the system will perform the usual read/write operation.

Note that interceptors may only be applied to the individual fields and **NOT** to groups of fields, since the interception is highly
dependent on the type of the field. 

```typescript
{
  fields: {
    field1: {
      type: String,
      
      // When we read, the value of `field1` will have a suffix of `is very cool!`
      readInterceptor: (request: ReadInterceptRequest<FieldType, ObjectType>) => request.value + " is very cool!"
      
      // When we write, we will prefix the value with `banana`
      writeInterceptor: (request: WriteInterceptRequest<FieldType, ObjectType>) => "banana" + request.value
    }
  }
}
```

#### Form submission validator

A special `submitCheck` can be added to fields where the condition to submit may differ from the condition to
save. An instance where this could be useful is when there is a minimum character requirement for a field, but a user may not
necessarily satisfy that condition if they submit early. Therefore, we must provide a second set of checkers for this situation.

If `submitCheck` is left blank, the validator will evaluate `writeCheck` in place.

`submitCheck` will be tested separately from the standard `writeCheck` since we want to accumulate all the errors across the entire
to present to the user. `editObject` will normally terminate as soon as an invalid field is found since all `writeCheck` conditions must be true 
for an edit to succeed.

```typescript
{
  writeCheck: true,
  FIELDS: {
    
    myCoolField: {
      type: String,
      
      writeCheck: (request: WriteCheckRequest<string, string>) => request.fieldValue.length < 100,
      submitCheck: (request: WriteCheckRequest<string, string>) => request.fieldValue.length >= 10 && request.fieldValue.length < 100,
      
      // The user can save myCoolField as much as they want as long as the length is less than 100,
      // however, when they submit the form we will ensure it is also at least length 10
    }
    
  }
}
```

Developed by Henry Tu and David Hui
