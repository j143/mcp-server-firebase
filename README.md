# mcp-server-firebase

Build an mcp server with firebase functions


Setting Up Google Service Account

Create Service Account:
-- Go to Google Cloud Console
-- Create a service account
-- Download the JSON key file


Enable Domain-Wide Delegation:

-- In Google Admin Console (for G Suite)
-- Add the service account client ID with Calendar scopes


Set Firebase Environment Variables:

-- bashfirebase functions:config:set google.service_account_key="$(cat service-account-key.json)"
-- firebase functions:config:set google.calendar_user_email="your-email@domain.com"

Deploy

bashfirebase deploy --only functions
