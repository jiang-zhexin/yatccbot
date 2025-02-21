import { Composer } from "grammy"

export const help = new Composer<MyContext>()

help.command(["start", "help"], async (c) => {
    await c.reply(
        `*Yet Another Privacy Chat Bot*

1\\. 此 Bot 工作在 [隐私模式](https://core.telegram.org/bots/features#privacy-mode) 下, 它不关心 \\(也不会收到\\) 除上下文外的任何消息

2\\. 请使用 \`/chat\` \\+ prompt, 或者对任意消息 \\(作为 prompt\\) 回复 \`/chat\` 以开始对话

3\\. 回复 Bot 的消息 \\(作为上下文\\) 以继续对话, 该上下文保存 7 天

*Terms and License*
[qwen 1\\.5 14b](https://github.com/QwenLM/Qwen/blob/main/LICENSE)
[llama 3\\.3 70b](https://github.com/meta-llama/llama-models/blob/main/models/llama3_3/LICENSE)
[gemma 7b](https://ai.google.dev/gemma/terms)

[*项目地址*](https://github.com/jiang-zhexin/yatccbot)
本项目使用 AGPL\\-3\\.0 license
`,
        {
            parse_mode: "MarkdownV2",
            reply_parameters: { message_id: c.msg.message_id },
            link_preview_options: { is_disabled: true },
        }
    )
})
