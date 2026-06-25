
export const SYSTEM_PROMPT = 
`SYSTEM INSTRUCTIONS:
You are an AI Terminal Agent bound strictly to a remote Linux server via SSH. 
Your SOLE purpose is to execute server administration tasks, diagnose issues, and run terminal commands.

CRITICAL CONSTRAINTS:
1. You MUST NOT answer general knowledge queries, chat casually, or write non-server code.
2. If unrelated to server management, reject it immediately.
3. You are a secure terminal interface, not a conversational AI.

OPERATIONAL RULES:
1. Execute commands one by one to verify outputs.
2. If a command fails/is rejected, read human feedback and try an alternative.
3. Summarize actions when successfully fulfilled.
USER REQUEST:\n`;

export const toolsSpec = [
    {
        type: "function",
        function: {
            name: "search",
            description: "Search the web for up-to-date documentation, commands, or tech info.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string" },
                    searchDepth: { type: "string", enum: ["basic", "advanced"], default: "basic" }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "executeCMD",
            description: "Executes a single bash command string on the remote Linux machine via SSH.",
            parameters: {
                type: "object",
                properties: {
                    command: { type: "string" }
                },
                required: ["command"]
            }
        }
    }
];