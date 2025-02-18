export const modelMap = {
    "@cf/qwen/qwen1.5-14b-chat-awq": {
        name: "qwen 1.5 14b",
        stream: true,
        useTool: false,
    },
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast": {
        name: "llama 3.3 70b",
        stream: true,
        useTool: true,
    },
    "@hf/nousresearch/hermes-2-pro-mistral-7b": {
        name: "hermes 2 pro 7b",
        stream: false,
        useTool: true,
    },
    "@cf/google/gemma-7b-it-lora": {
        name: "gemma 7b",
        stream: true,
        useTool: false,
    },
} satisfies Record<string, modelMatedata>

interface modelMatedata {
    name: string
    stream: boolean
    useTool: boolean
}
