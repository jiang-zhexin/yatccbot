import type { LanguageModelV1StreamPart, LanguageModelV1CallOptions, LanguageModelV1, LanguageModelV1CallWarning } from "@ai-sdk/provider"
import { events } from "fetch-event-stream"

import { convertToWorkersAIChatMessages } from "./convert-to-workersai-chat-messages"
import type { WorkersAIChatSettings } from "./workersai-chat-settings"
import type { GenerateResult, StreamChunk } from "./workersai-chat-type"

type WorkersAIChatConfig = {
    provider: string
    binding: Ai
    gateway?: GatewayOptions
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
        topK,
        frequencyPenalty,
        presencePenalty,
        seed,
    }: LanguageModelV1CallOptions): {
        args: AiTextGenerationInput
        warnings: LanguageModelV1CallWarning[]
    } {
        const type = mode.type
        const warnings: LanguageModelV1CallWarning[] = []
        const baseArgs: AiTextGenerationInput = {
            max_tokens: maxTokens,
            temperature: temperature,
            top_p: topP,
            top_k: topK,
            seed: seed,
            frequency_penalty: frequencyPenalty,
            presence_penalty: presencePenalty,
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
                    },
                    warnings,
                }
            }
            case "object-tool": {
                return {
                    args: {
                        ...baseArgs,
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

    async doGenerate(options: LanguageModelV1CallOptions): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
        const { args, warnings } = this.getArgs(options)
        const response = (await this.config.binding.run(this.modelId, args, { gateway: this.config.gateway })) as GenerateResult
        if (response instanceof ReadableStream) {
            throw new Error("This shouldn't happen")
        }

        return {
            text: response.response ?? "",
            toolCalls: response.tool_calls?.map((toolCall) => ({
                toolCallType: "function",
                toolCallId: toolCall.name,
                toolName: toolCall.name,
                args: JSON.stringify(toolCall.arguments || {}),
            })),
            finishReason: response.tool_calls ? "tool-calls" : "stop",
            rawCall: { rawPrompt: args.messages, rawSettings: args },
            usage: {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
            },
            warnings,
        }
    }

    async doStream(options: LanguageModelV1CallOptions): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
        const { args, warnings } = this.getArgs(options)
        const response = await this.config.binding.run(this.modelId, { ...args, stream: true }, { gateway: this.config.gateway })
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
                        const chunk = JSON.parse(event.data) as StreamChunk
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
