type PipelineMessagingConfig = { archEndpoint: string, archExchange: string }

type archIO = {
    id: number
    endpoint: string
    pipelines: Record<number, pipeIO>
}

type pipeIO = {
    queues: Record<string, queue>
}

type queue = {
    steps: Record<number, Step>
}

type Step = {
    block: string
    fn: string
    pre?: StepPre
    do?: string
    post: StepPost
    extraArgs: any[]
    outStep?: number
    outQueue?: string
    outCondition?: Array<{
        fn: (context: any) => boolean
        outStep: number
        outQueue: string
    }>
    implicitOutStep?: number
}

type StepPre = {
    pick: { key?: string, value?: any }
    select?: Array<{
        from?: string
        value?: string
        to: string
        type: string
    }>
}

type StepPost = {
    set: string
    upsert: Array<{
        from?: string
        value?: string
        to: string
    }>
    unset: string[]
}

type archIOMerged = {
    id: number
    endpoint: string
    pipelines: Record<number, {
        queues: Record<string, {
            steps: Record<number, {
                fn: string
                extraArgs: any[]
                pre?: {
                    pick: { key: string } | { value: any }
                    select?: Array<{
                        from: string
                        to: string
                    } | {
                        value: string
                        to: string
                    }>
                }
                post?: {
                    set: string
                    upsert: Array<{
                        from: string
                        to: string
                    } | {
                        value: string
                        to: string
                    }>
                    unset: string[]
                }
                outStep?: number
                outQueue?: string
                implicitOutStep?: number
                outCondition?: Array<{
                    fn: (context: any) => boolean
                    outStep: number
                    outQueue: string
                }>
            }>
        }>
    }>
}
