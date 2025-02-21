import { Octokit } from "@octokit/core";
import express, {NextFunction, Request, Response} from "express";
import {Webhook, WebhookUnbrandedRequiredHeaders, WebhookVerificationError} from "standardwebhooks"

const app = express();
const port = process.env.PORT || 3001;
const renderWebhookSecret = process.env.RENDER_WEBHOOK_SECRET || '';

const renderAPIURL = process.env.RENDER_API_URL || "https://api.render.com/v1"

// To create a Render API token, follow instructions here: https://render.com/docs/api#1-create-an-api-key
const renderAPIToken = process.env.RENDER_API_TOKEN || '';

const githubAPIToken = process.env.GITHUB_TOKEN || '';
const githubOwnerName = process.env.GITHUB_OWNER_NAME || '';
const githubRepoName = process.env.GITHUB_REPO_NAME || '';

const octokit = new Octokit({
    auth: githubAPIToken
})

interface WebhookData {
    id: string
    serviceId: string
}

interface WebhookPayload {
    type: string
    timestamp: Date
    data: WebhookData
}

interface RenderService {
    id: string
    name: string
    repo: string
}

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
                const event = await fetchEventInfo(payload)

                // TODO add human readable status
                if (event.details.status != 2) {
                    console.log(`deploy ended for service ${payload.data.serviceId} with unsuccessful status`)
                    return
                }

                const service: RenderService = await fetchServiceInfo(payload)

                if (! service.repo.includes(`${githubOwnerName}/${githubRepoName}`)) {
                    console.log(`received deploy success for another service: ${service.name}`)
                    return
                }

                // TODO trigger github action
                console.log(`triggering github workflow for ${githubOwnerName}/${githubRepoName} for ${service.name}`)
                await triggerWorkflow()
                return
            default:
                console.log(`unhandled webhook type ${payload.type} for service ${payload.data.serviceId}`)
        }
    } catch (error) {
        console.error(error)
    }
}

async function triggerWorkflow() {
    await octokit.request('GET /repos/{owner}/{repo}/actions/workflows', {
        owner: githubOwnerName,
        repo: githubRepoName,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })
}

// fetchEventInfo fetches the event that triggered the webhook
// some events have additional information that isn't in the webhook payload
// for example, deploy events have the deploy id
async function fetchEventInfo(payload: WebhookPayload) {
    const res = await fetch(
        `${renderAPIURL}/events/${payload.data.id}`,
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
        throw new Error(`unable to fetch event info; received code :${res.status.toString()}`)
    }
}

async function fetchServiceInfo(payload: WebhookPayload) {
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
