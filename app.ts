import {Octokit} from "@octokit/core";
import express, {NextFunction, Request, Response} from "express";
import {Webhook, WebhookUnbrandedRequiredHeaders, WebhookVerificationError} from "standardwebhooks"
import {RenderDeploy, RenderEvent, RenderService, WebhookPayload} from "./render";

const app = express();
const port = process.env.PORT || 3001;
const renderWebhookSecret = process.env.RENDER_WEBHOOK_SECRET || '';

if (!renderWebhookSecret ) {
    console.error("Error: RENDER_WEBHOOK_SECRET is not set.");
    process.exit(1);
}

const renderAPIURL = process.env.RENDER_API_URL || "https://api.render.com/v1"

// To create a Render API token, follow instructions here: https://render.com/docs/api#1-create-an-api-key
const renderAPIToken = process.env.RENDER_API_KEY || '';

if (!renderAPIToken) {
    console.error("Error: RENDER_API_KEY is not set.");
    process.exit(1);
}

const githubAPIToken = process.env.GITHUB_API_TOKEN || '';
const githubOwnerName = process.env.GITHUB_OWNER_NAME || '';
const githubRepoName = process.env.GITHUB_REPO_NAME || '';

if (!githubAPIToken || !githubOwnerName || !githubRepoName) {
		console.error("Error: GITHUB_API_TOKEN, GITHUB_OWNER_NAME, or GITHUB_REPO_NAME is not set.");
		process.exit(1);
}

const githubWorkflowID = process.env.GITHUB_WORKFLOW_ID || 'example.yaml';

const octokit = new Octokit({
    auth: githubAPIToken
})

app.post("/webhook", express.raw({type: 'application/json'}), (req: Request, res: Response, next: NextFunction) => {
    try {
        validateWebhook(req);
    } catch (error) {
        return next(error)
    }

    const payload: WebhookPayload = JSON.parse(req.body)

    res.status(200).send({}).end()

    // handle the webhook async so we don't timeout the request
    handleWebhook(payload)
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    if (err instanceof WebhookVerificationError) {
        res.status(400).send({}).end()
    } else {
        res.status(500).send({}).end()
    }
});

app.get('/', (req: Request, res: Response) => {
  res.send('Render Webhook GitHub Action is listening!')
})

const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));

function validateWebhook(req: Request) {
    const headers: WebhookUnbrandedRequiredHeaders = {
        "webhook-id": req.header("webhook-id") || "",
        "webhook-timestamp": req.header("webhook-timestamp") || "",
        "webhook-signature": req.header("webhook-signature") || ""
    }

    const wh = new Webhook(renderWebhookSecret);
    wh.verify(req.body, headers);
}

async function handleWebhook(payload: WebhookPayload) {
    try {
        switch (payload.type) {
            case "deploy_ended":
                console.log("handling deploy_ended event")
                const event = await fetchEventInfo(payload)

                // TODO add human readable status
                if (event.details.status != 2) {
                    console.log(`deploy ended for service ${payload.data.serviceId} with unsuccessful status`)
                    return
                }

                const deploy = await fetchDeployInfo(payload.data.serviceId, event.details.deployId)
                if (!deploy.commit) {
                    console.log(`ignoring deploy success for image backed service: ${payload.data.serviceId}`)
                    return
                }

                const service = await fetchServiceInfo(payload)

                if (! service.repo.includes(`${githubOwnerName}/${githubRepoName}`)) {
                    console.log(`ignoring deploy success for another service: ${service.name}`)
                    return
                }

                console.log(`triggering github workflow for ${githubOwnerName}/${githubRepoName} for ${service.name}`)
                await triggerWorkflow(service.id, service.branch)
                return
            default:
                console.log(`unhandled webhook type ${payload.type} for service ${payload.data.serviceId}`)
        }
    } catch (error) {
        console.error(error)
    }
}

async function triggerWorkflow(serviceID: string, branch: string) {
    await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
        owner: githubOwnerName,
        repo: githubRepoName,
        workflow_id: githubWorkflowID,
        ref: branch,
        inputs: {
            serviceID: serviceID
        },
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })
}

// fetchEventInfo fetches the event that triggered the webhook
// some events have additional information that isn't in the webhook payload
// for example, deploy events have the deploy id
async function fetchEventInfo(payload: WebhookPayload): Promise<RenderEvent> {
    const url = `${renderAPIURL}/events/${payload.data.id}`
		console.log(`fetching event info at ${url}`)
    const res = await fetch(
        url,
        {
            method: "GET",
            headers: {
                accept: "application/json",
                authorization: `Bearer ${renderAPIToken}`,
            },
        },
    )

    if (res.ok) {
        return res.json()
    } else {
        throw new Error(`unable to fetch event info; received code ${res.status.toString()}`)
    }
}

async function fetchDeployInfo(serviceId: string, deployId: string): Promise<RenderDeploy> {
    const res = await fetch(
        `${renderAPIURL}/services/${serviceId}/deploys/${deployId}`,
        {
            method: "get",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${renderAPIToken}`,
            },
        },
    )
    if (res.ok) {
        return res.json()
    } else {
        throw new Error(`unable to fetch deploy info; received code :${res.status.toString()}`)
    }
}

async function fetchServiceInfo(payload: WebhookPayload): Promise<RenderService> {
    const res = await fetch(
        `${renderAPIURL}/services/${payload.data.serviceId}`,
        {
            method: "get",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${renderAPIToken}`,
            },
        },
    )
    if (res.ok) {
        return res.json()
    } else {
        throw new Error(`unable to fetch service info; received code :${res.status.toString()}`)
    }
}

process.on('SIGTERM', () => {
    console.debug('SIGTERM signal received: closing HTTP server')
    server.close(() => {
        console.debug('HTTP server closed')
    })
})
