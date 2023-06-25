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
    }>
}

type StepPost = {
    set: string
    initArray: string
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
                block: string
                fn: string
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
                do?: string
                post: {
                    set: string
                    initArray: string
                    upsert: Array<{
                        from: string
                        to: string
                    } | {
                        value: string
                        to: string
                    }>
                    unset: string[]
                }
                extraArgs: any[]
                outStep?: number
                outQueue?: string
                outCondition?: Array<{
                    fn: (context: any) => boolean
                    outStep: number
                    outQueue: string
                }>
                implicitOutStep?: number
            }>
        }>
    }>
}