// copyright: https://github.com/cloudflare/workers-ai-provider

import { WorkersAIChatLanguageModel } from "./workersai-chat-language-model"
import type { WorkersAIChatSettings } from "./workersai-chat-settings"

export interface WorkersAI {
    (modelId: BaseAiTextGenerationModels, settings?: WorkersAIChatSettings): WorkersAIChatLanguageModel
    chat(modelId: BaseAiTextGenerationModels, settings?: WorkersAIChatSettings): WorkersAIChatLanguageModel
}

export interface WorkersAISettings {
    binding: Ai
    gateway?: GatewayOptions
}

export function createWorkersAI(options: WorkersAISettings): WorkersAI {
    const createChatModel = (modelId: BaseAiTextGenerationModels, settings: WorkersAIChatSettings = {}): WorkersAIChatLanguageModel =>
        new WorkersAIChatLanguageModel(modelId, settings, {
            provider: "workersai.chat",
            binding: options.binding,
        })

    const provider = function (modelId: BaseAiTextGenerationModels, settings?: WorkersAIChatSettings): WorkersAIChatLanguageModel {
        if (new.target) {
            throw new Error("The WorkersAI model function cannot be called with the new keyword.")
        }
        return createChatModel(modelId, settings)
    }

    provider.chat = createChatModel
    return provider
}
