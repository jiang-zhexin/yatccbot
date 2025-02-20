import { tool } from "ai"
import { z } from "zod"

export const getWebsiteContent = tool({
    description: "Extracting web content",
    parameters: z.object({ url: z.string().describe("The url of Website") }),
    execute: async (args, options) => {
        console.log({ args: args })
        return fetch(args.url).then((resp) => resp.text())
    },
})
