type CompiledArchitecture = {
    name: string
    id: number
    datasets: Record<string, Dataset>
    environments: Record<string, Environment>
}

type Dataset = DatasetDB | DatasetSecret

type DatasetDB = {
    type: 'mongodb'
    url: string
    db: string
    collection: string
}

type DatasetSecret = {
    type: 'secret'
    generate: true
    size: number
} |  {
    type: 'secret'
    encoding: string
    value: string
}

type Environment = {
    endpoint: string
    managementEndpoint: string
    pipelineEndpoint: string
    pipelines: Record<number, Pipeline>
}

type Pipeline = {
    steps: Record<number, Step>
}


type Step = {
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
    outCondition?: Array<{
        fn: string
        outStep: number
    }>
    implicitOutStep?: number
}

type CompiledArchitectureMerged = {
    name: string
    id: number
    datasets: Record<string, {
        type: 'mongodb'
        url: string
        db: string
        collection: string
    } | {
        type: 'secret'
        generate: true
        size: number
    } | {
        type: 'secret'
        generate?: false
        encoding: string
        value: string
    }>
    environments: Record<string, {
        endpoint: string
        managementEndpoint: string
        pipelineEndpoint: string
        pipelines: Record<number, {
            steps: Record<number, {
                block: string
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
                implicitOutStep?: number
                outCondition?: Array<{
                    fn: string
                    outStep: number
                }>
            }>
        }>
    }>
}