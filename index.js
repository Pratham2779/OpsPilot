import {config} from 'dotenv';
config();

import { connect, disconnect } from "./tools/ssh.tool.js";
import { askHuman } from "./utils.js";
import { SYSTEM_PROMPT } from "./constants.js";
import { agentApp } from "./agent.js";

async function runInteractiveTerminalAgent(sshConfig) {
    console.log("Initializing SSH Connection...");
    try {
        await connect(sshConfig.host, sshConfig.port, sshConfig.username, sshConfig.keyPath);
        console.log("Connected to Remote Server.\n\n=========================================\nTerminal Agent Ready!\nType your command to begin, or 'exit'/'quit' to end.\n=========================================\n");
    } catch (err) {
        console.error("Failed to connect to server:", err.message);
        return;
    }

    let chatHistory = [];
    let isFirstMessage = true;

    while (true) {
        const userInput = await askHuman("You: ");
        if (['exit', 'quit'].includes(userInput.toLowerCase())) break;
        if (!userInput) continue;

        const messageContent = isFirstMessage ? SYSTEM_PROMPT + userInput : userInput;
        isFirstMessage = false;

        chatHistory.push({ role: "user", content: messageContent });
        console.log("Thinking...");

        try {
            chatHistory = (await agentApp.invoke({ messages: chatHistory, loopCount: 0 })).messages;
            console.log(`\n=========================================\nAgent:\n${chatHistory[chatHistory.length - 1].content || "[Tool Executed / Internal Processing]"}\n=========================================\n`);
        } catch (error) {
            console.error("\nError during agent execution:", error);
            chatHistory.pop();
        }
    }

    console.log("\nCleaning up connections...");
    await disconnect();
    console.log("Agent session finished.");
}



// Execute the application
runInteractiveTerminalAgent({
    host:process.env.SSH_HOST,
    port: process.env.SSH_PORT,
    username: process.env.SSH_USERNAME,
    keyPath: process.env.SSH_KEY_PATH
});