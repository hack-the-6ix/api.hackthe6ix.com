#!/bin/sh

# Source environment variables
source $HT6_ENV_SOURCE

# Run bootstrap (let it complete)
node ./dist/bootstrap/bootstrap.js

# Run main application (replace current process)
exec node ./dist/index.js 