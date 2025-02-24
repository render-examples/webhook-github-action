interface WebhookData {
    id: string
    serviceId: string
}

export interface WebhookPayload {
    type: string
    timestamp: Date
    data: WebhookData
}

export interface RenderService {
    id: string
    name: string
    repo: string
    branch: string
}

interface Commit {
    id: string
    message: string
}

export interface RenderDeploy {
    id: string
    commit?: Commit
}

export interface RenderEvent {
    id: string
    type: string
    details: any
}
