# Example to Trigger GitHub Actions from a Render Webhook

This example triggers a GitHub Action workflow that creates a deploy when a deploy ended webhook is received for a specific service.
While this specific example GitHub Action triggers another deploy, you may also want to:
- Run end-to-end tests
- Clear a CDN cache to serve the latest content
- Notify a monitoring system about new deployment details
- Sync data or run other post deployment migrations

## Prerequisites
If you haven't already, [sign up for a Render account](https://dashboard.render.com/register).
Creating webhooks on Render requires a Professional plan or higher. You can [view and upgrade your plan](https://dashboard.render.com/billing/update-plan) in the Render Dashboard.

## Deploy to Render

1. Use the button below to deploy to Render </br>
<a href="https://render.com/deploy?repo=https://github.com/render-examples/webhook-github-action/tree/main"><img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render"></a>
2. Follow the [Render documentation](https://render.com/docs/webhooks) to create a webhook with the URL from your service and `/webhook` path that is triggered upon only the `DeployEnded` event. Save the signing secret as the `RENDER_WEBHOOK_SECRET` environment variable.
3. Follow the [Render documentation](https://render.com/docs/api#1-create-an-api-key) to create a Render API Key. Save the key as the `RENDER_API_KEY` environment variable.
4. Follow [the GitHub documentation](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-a-repository) to create a GitHub Action secret named `RENDER_API_KEY` in your GitHub repo with the Render API key you created.
5. Follow [the GitHub documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token) to create a GitHub API token with read/write permissions for `Actions`. Save the token as the `GITHUB_API_TOKEN` environment variable.
6. Create a GitHub workflow with a dispatch trigger as shown in the [example](./.github/workflows/example.yaml). You can check out [Git Hub Actions Documentation](https://docs.github.com/en/actions) for more information.
7. Set the following environment variables:
    - `RENDER_WEBHOOK_SECRET` environment variable to the secret from the webhook created in step 2
    - `RENDER_API_KEY` to the key created in step 3
    - `GITHUB_API_TOKEN` to the token created in step 4
    - `GITHUB_OWNER_NAME` to the owner of the GitHub repo the workflow is in (ex. `render-examples`)
    - `GITHUB_REPO_NAME` to the GitHub repo the workflow is in (ex. `webhook-github-action`)
    - `GITHUB_WORKFLOW_ID` to the ID or filename of the workflow to trigger (ex. `example.yaml`)
8. Trigger a service deploy and watch the GitHub workflow get triggered.

## Developing

Once you've created a project and installed dependencies with `pnpm install`, start a development server:

```bash
pnpm run dev
```

## Building

```bash
pnpm run build
```
