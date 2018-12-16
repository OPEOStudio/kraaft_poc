
# Kraaft POC

## Installation

Copy `./config/local.example.yml` to `./config/local.yml`

### Zello Credentials

 * Follow this [guide](https://github.com/zelloptt/zello-channel-api/blob/master/AUTH.md#for-zellowork) to create your
   credentials,
 * Copy the developer token to `zello.auth.dev_token` in `./config/local.yml`

### Google Credentials

 * Generate a key following this [guide](https://cloud.google.com/docs/authentication/getting-started)
 * Copy the downloaded key to the path <PROJECT_DIR>/.credentials/gcp.json

### Install dependencies

    yarn install

## Run

    yarn start

Or in dev mode (automatic restart when code is modified)

    yarn dev

## Run unit tests

    yarn test