import { LanguageModelV1StreamPart, type LanguageModelV1, type LanguageModelV1CallWarning } from "@ai-sdk/provider"
import { convertToWorkersAIChatMessages } from "./convert-to-workersai-chat-messages"
import type { WorkersAIChatSettings } from "./workersai-chat-settings"

import { events } from "fetch-event-stream"

type WorkersAIChatConfig = {
    provider: string
    binding: Ai
    gateway?: GatewayOptions
}

interface result {
    response: null | string
    tool_calls?: {
        name: string
        arguments: Record<string, unknown>
    }[]
    usage: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
}

export class WorkersAIChatLanguageModel implements LanguageModelV1 {
    readonly specificationVersion = "v1"
    readonly defaultObjectGenerationMode = "json"

    readonly modelId: BaseAiTextGenerationModels
    readonly settings: WorkersAIChatSettings

    private readonly config: WorkersAIChatConfig

    constructor(modelId: BaseAiTextGenerationModels, settings: WorkersAIChatSettings, config: WorkersAIChatConfig) {
        this.modelId = modelId
        this.settings = settings
        this.config = config
    }

    get provider(): string {
        return this.config.provider
    }

    private getArgs({
        mode,
        prompt,
        maxTokens,
        temperature,
        topP,
        frequencyPenalty,
        presencePenalty,
        seed,
    }: Parameters<LanguageModelV1["doGenerate"]>[0]) {
        const type = mode.type

        const warnings: LanguageModelV1CallWarning[] = []

        if (frequencyPenalty != null) {
            warnings.push({
                type: "unsupported-setting",
                setting: "frequencyPenalty",
            })
        }

        if (presencePenalty != null) {
            warnings.push({
                type: "unsupported-setting",
                setting: "presencePenalty",
            })
        }

        const baseArgs = {
            model: this.modelId,
            safe_prompt: this.settings.safePrompt,
            max_tokens: maxTokens,
            temperature,
            top_p: topP,
            random_seed: seed,
            messages: convertToWorkersAIChatMessages(prompt),
        }

        switch (type) {
            case "regular": {
                return {
                    args: { ...baseArgs, ...prepareToolsAndToolChoice(mode) },
                    warnings,
                }
            }
            case "object-json": {
                return {
                    args: {
                        ...baseArgs,
                        response_format: { type: "json_object" },
                    },
                    warnings,
                }
            }
            case "object-tool": {
                return {
                    args: {
                        ...baseArgs,
                        tool_choice: "any",
                        tools: [{ type: "function", function: mode.tool }],
                    },
                    warnings,
                }
            }
            default: {
                const exhaustiveCheck = type satisfies never
                throw new Error(`Unsupported type: ${exhaustiveCheck}`)
            }
        }
    }

    async doGenerate(options: Parameters<LanguageModelV1["doGenerate"]>[0]): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
        const { args, warnings } = this.getArgs(options)
        const response = (await this.config.binding.run(args.model, { ...args }, { gateway: this.config.gateway })) as result
        if (response instanceof ReadableStream) {
            throw new Error("This shouldn't happen")
        }

        return {
            text: response.response ?? "",
            toolCalls: response.tool_calls?.map((toolCall) => ({
                toolCallType: "function",
                toolCallId: toolCall.name, // TODO: what can the id be?
                toolName: toolCall.name,
                args: JSON.stringify(toolCall.arguments || {}),
            })),
            finishReason: response.tool_calls ? "tool-calls" : "stop", // TODO: mapWorkersAIFinishReason(response.finish_reason),
            rawCall: { rawPrompt: args.messages, rawSettings: args },
            usage: {
                // TODO: mapWorkersAIUsage(response.usage),
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
            },
            warnings,
        }
    }

    async doStream(options: Parameters<LanguageModelV1["doStream"]>[0]): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
        const { args, warnings } = this.getArgs(options)
        const response = await this.config.binding.run(args.model, { ...args, stream: true }, { gateway: this.config.gateway })
        if (!(response instanceof ReadableStream)) {
            throw new Error("This shouldn't happen")
        }

        const textStream = events(new Response(response))
        return {
            stream: new ReadableStream<LanguageModelV1StreamPart>({
                async start(controller) {
                    for await (const event of textStream) {
                        if (!event.data) {
                            continue
                        }
                        if (event.data === "[DONE]") {
                            controller.close()
                            return
                        }
                        const chunk = JSON.parse(event.data) as chunk
                        if (chunk.usage) {
                            controller.enqueue({
                                type: "finish",
                                finishReason: "stop",
                                usage: {
                                    promptTokens: chunk.usage.prompt_tokens,
                                    completionTokens: chunk.usage.completion_tokens,
                                },
                            })
                            controller.close()
                            return
                        }
                        chunk.response.length &&
                            controller.enqueue({
                                type: "text-delta",
                                textDelta: chunk.response,
                            })
                    }
                },
            }),
            rawCall: { rawPrompt: args.messages, rawSettings: args },
            warnings,
        }
    }
}

interface chunk {
    response: string
    p?: string
    usage?: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
}

function prepareToolsAndToolChoice(
    mode: Parameters<LanguageModelV1["doGenerate"]>[0]["mode"] & {
        type: "regular"
    }
) {
    // when the tools array is empty, change it to undefined to prevent errors:
    const tools = mode.tools?.length ? mode.tools : undefined

    if (tools == null) {
        return { tools: undefined, tool_choice: undefined }
    }

    const mappedTools = tools.map((tool) => ({
        type: "function",
        function: {
            name: tool.name,
            // @ts-expect-error - description is not a property of tool
            description: tool.description,
            // @ts-expect-error - parameters is not a property of tool
            parameters: tool.parameters,
        },
    }))

    const toolChoice = mode.toolChoice

    if (toolChoice == null) {
        return { tools: mappedTools, tool_choice: undefined }
    }

    const type = toolChoice.type

    switch (type) {
        case "auto":
            return { tools: mappedTools, tool_choice: type }
        case "none":
            return { tools: mappedTools, tool_choice: type }
        case "required":
            return { tools: mappedTools, tool_choice: "any" }

        // workersAI does not support tool mode directly,
        // so we filter the tools and force the tool choice through 'any'
        case "tool":
            return {
                tools: mappedTools.filter((tool) => tool.function.name === toolChoice.toolName),
                tool_choice: "any",
            }
        default: {
            const exhaustiveCheck = type satisfies never
            throw new Error(`Unsupported tool choice type: ${exhaustiveCheck}`)
        }
    }
}
