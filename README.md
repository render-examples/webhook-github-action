# Example to Trigger GitHub Actions from a Render Webhook

This example triggers a GitHub Action workflow when a deploy ended webhook is received for a specific service.

## Deploy to Render

1. Use the button below to deploy to Render </br>
<a href="https://render.com/deploy?repo=https://github.com/render-examples/twingate-example/tree/main"><img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render"></a>

2. Follow [instructions](https://render.com/docs/webhooks) to create a webhook with the URL from your service and `/webhook` path
3. Follow [instructions](https://render.com/docs/api#1-create-an-api-key) to create a Render API Key
4. Follow [instructions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token) to create a GitHub api token with read/write permissions for `Actions`
5. Create a github workflow with a dispatch trigger as shown in the [example](./.github/workflows/example.yaml)
6. Set the following env vars
   - `RENDER_WEBHOOK_SECRET` environment variable to the secret from the webhook created in step 2
   - `RENDER_API_KEY` to the key created in step 3
   - `GITHUB_API_TOKEN` to the token created in step 4
   - `GITHUB_OWNER_NAME` to the owner of the GitHub repo the workflow is in (ex. `render-examples`)
   - `GITHUB_REPO_NAME` to the GitHub repo the workflow is in (ex. `webhook-github-action`)
   - `GITHUB_WORKFLOW_ID` to the ID or filename of the workflow to trigger (ex. `example.yaml`)
7. Trigger a service deploy and watch the GitHub workflow get triggered.
