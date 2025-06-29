export const modelMap = {
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast": {
        id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        name: "llama 3.3 70b",
        stream: true,
        useTool: true,
        provider: "workers-ai",
        think: false,
    },
    "@cf/meta/llama-4-scout-17b-16e-instruct": {
        id: "@cf/meta/llama-4-scout-17b-16e-instruct",
        name: "llama 4 17b",
        stream: true,
        useTool: false,
        provider: "workers-ai",
        think: false,
    },
    "@cf/google/gemma-3-12b-it": {
        id: "@cf/google/gemma-3-12b-it",
        name: "gemma 3 12b",
        stream: true,
        useTool: false,
        provider: "workers-ai",
        think: false,
    },
    "@cf/mistralai/mistral-small-3.1-24b-instruct": {
        id: "@cf/mistralai/mistral-small-3.1-24b-instruct",
        name: "mistral 3.1 24b",
        stream: true,
        useTool: false,
        provider: "workers-ai",
        think: false,
    },
    "gemini-2.0-flash-001": {
        id: "gemini-2.0-flash-001",
        name: "gemini 2.0 flash",
        stream: true,
        useTool: true,
        provider: "google-ai-studio",
        think: false,
    },
    "gemini-2.5-flash-lite-preview-06-17": {
        id: "gemini-2.5-flash-lite-preview-06-17",
        name: "gemini 2.5 flash lite",
        stream: true,
        useTool: true,
        provider: "google-ai-studio",
        think: false,
    },
} as const satisfies Record<string, modelMatedata>

export const defaultModel: keyof typeof modelMap = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
