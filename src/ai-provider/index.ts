// copyright: https://github.com/cloudflare/workers-ai-provider

import { WorkersAIChatLanguageModel } from "./workersai-chat-language-model"
import type { WorkersAIChatSettings } from "./workersai-chat-settings"
import type { TextGenerationModels } from "./workersai-models"

export interface WorkersAI {
    (modelId: TextGenerationModels, settings?: WorkersAIChatSettings): WorkersAIChatLanguageModel
    chat(modelId: TextGenerationModels, settings?: WorkersAIChatSettings): WorkersAIChatLanguageModel
}

export interface WorkersAISettings {
    binding: Ai
    gateway?: GatewayOptions
}

export function createWorkersAI(options: WorkersAISettings): WorkersAI {
    const createChatModel = (modelId: TextGenerationModels, settings: WorkersAIChatSettings = {}) =>
        new WorkersAIChatLanguageModel(modelId, settings, {
            provider: "workersai.chat",
            binding: options.binding,
            gateway: options.gateway,
        })

    const provider = function (modelId: TextGenerationModels, settings?: WorkersAIChatSettings) {
        if (new.target) {
            throw new Error("The WorkersAI model function cannot be called with the new keyword.")
        }
        return createChatModel(modelId, settings)
    }

    provider.chat = createChatModel
    return provider
}
