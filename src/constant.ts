export const modelMap = {
    "@cf/qwen/qwen1.5-14b-chat-awq": {
        id: "@cf/qwen/qwen1.5-14b-chat-awq",
        name: "qwen 1.5 14b",
        stream: true,
        useTool: false,
        provider: "workers-ai",
    },
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast": {
        id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        name: "llama 3.3 70b",
        stream: true,
        useTool: true,
        provider: "workers-ai",
    },
    "@cf/google/gemma-7b-it-lora": {
        id: "@cf/google/gemma-7b-it-lora",
        name: "gemma 7b",
        stream: true,
        useTool: false,
        provider: "workers-ai",
    },
    "gemini-2.0-flash-001": {
        id: "gemini-2.0-flash-001",
        name: "gemini 2.0 flash",
        stream: true,
        useTool: true,
        provider: "google-ai-studio",
    },
} as const satisfies Record<string, modelMatedata>
