import { extractReasoningMiddleware, wrapLanguageModel, type LanguageModel } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createWorkersAI } from "workers-ai-provider"

export function ChooseModel(env: Env, modelMatedata: modelMatedata): LanguageModel {
    const model = chooseModel(env, modelMatedata)
    if (modelMatedata.think === false) {
        return model
    }
    return wrapLanguageModel({
        model: model as any,
        middleware: extractReasoningMiddleware({ tagName: "think", startWithReasoning: true }),
    })
}

function chooseModel(env: Env, modelMatedata: modelMatedata): LanguageModel {
    switch (modelMatedata.provider) {
        case "workers-ai":
            const workersAI = createWorkersAI({ binding: env.AI, gateway: { id: "yatccbot", collectLog: true } })
            //@ts-ignore
            return workersAI(modelMatedata.id)

        case "google-ai-studio":
            const googleAI = createGoogleGenerativeAI({
                apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
                fetch: async (input, init): Promise<Response> => {
                    const req = new Request(input, init)
                    const { pathname, searchParams } = new URL(req.url)

                    return req
                        .json()
                        .then((q) =>
                            env.AI.gateway("yatccbot").run({
                                provider: "google-ai-studio",
                                endpoint: `${pathname}?${searchParams}`,
                                headers: Object.fromEntries(req.headers.entries()),
                                query: q,
                            })
                        )
                        .catch(() => fetch(input, init))
                },
            })
            return googleAI(modelMatedata.id)
    }
}
