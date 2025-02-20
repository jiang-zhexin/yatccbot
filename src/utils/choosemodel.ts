import { type LanguageModelV1 } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

import { createWorkersAI } from "../ai-provider"

export function ChooseModel(env: Env, modelMatedata: modelMatedata): LanguageModelV1 {
    switch (modelMatedata.provider) {
        case "workers-ai":
            const workersAI = createWorkersAI({ binding: env.AI, gateway: { id: "yatccbot", collectLog: true } })
            return workersAI(modelMatedata.id)

        case "google-ai-studio":
            const googleAI = createGoogleGenerativeAI({
                apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
                fetch: async (input, init): Promise<Response> => {
                    const req = new Request(input, init)
                    const { pathname, searchParams } = new URL(req.url)

                    return env.AI.gateway("yatccbot").run({
                        provider: "google-ai-studio",
                        endpoint: `${pathname}?${searchParams}`,
                        headers: Object.fromEntries(req.headers.entries()),
                        query: await req.json(),
                    })
                },
            })
            return googleAI(modelMatedata.id)
    }
}
