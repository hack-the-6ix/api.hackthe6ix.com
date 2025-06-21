# Configuration

WARNING: If you are using the Kubernetes Helm chart, this directory is completely overriden, so do not store any assets that are not loaded by the Helm chart in here (like code)!

## Mailer
Before the server starts up, the configuration file will be checked
against the Enums [here](../src/types/mailer.ts) to ensure it is valid.
If more templates or lists are added, it is important to add it to the list
to ensure reliability.

WARNING: For the lists query, we support only passing an object that will AND all the fields specified, or a TOP-LEVEL $or. No other operators are supported!


```
{
  "templates": {
    "applicationIncomplete": { // This is the human-friendly name that can be used within the backend to identify templates
      "templateID": XXXXXX // This is the ListMonk templateID
    },
    ...
  },
  "lists": {
    "applicationIncomplete": { // This is the human-friendly name that can be used within the backend to identify mailing lists
      "listID": XXXXXX, // This is the ListMonk mailing list ID
      "query": { // Users who match this mongoDB query will be included in this mailing list after sync
        "status.applied": true // example
      }
    },
    ...
  }
}
```
