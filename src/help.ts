import { Composer } from "grammy"

export const help = new Composer<MyContext>()

help.command(["start", "help"], async (c) => {
    await c.reply(
        `*Yet Another Tree Context Chat Bot*

1\\. 使用 \`/chat\` \\+ prompt, 或者对任意消息 \\(作为 prompt\\) 回复 \`/chat\` 以开始对话

2\\. 回复 Bot 的消息 \\(作为上下文\\) 以继续对话, 该上下文保存 7 天

更多关于本 Bot 的信息, 移步 [项目地址](https://github.com/jiang-zhexin/yatccbot)

*Terms and License*
[deepseek r1 distill qwen 32b](https://github.com/deepseek-ai/DeepSeek-R1/blob/main/LICENSE)
[qwen 1\\.5 14b](https://github.com/QwenLM/Qwen/blob/main/LICENSE)
[llama 3\\.3 70b](https://github.com/meta-llama/llama-models/blob/main/models/llama3_3/LICENSE)
[gemma 7b](https://ai.google.dev/gemma/terms)
`,
        {
            parse_mode: "MarkdownV2",
            reply_parameters: { message_id: c.msg.message_id },
            link_preview_options: { is_disabled: true },
        }
    )
})
