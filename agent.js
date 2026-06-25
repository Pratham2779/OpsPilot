import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { client } from "./llm.js";
import { search } from "./tools/search.tool.js";
import { executeCMD } from "./tools/ssh.tool.js";
import { commandRiskClassifier } from "./tools/commandRiskClassifier.tool.js";
import { askHuman, truncateOutput } from "./utils.js";
import { toolsSpec } from "./constants.js";

const AgentState = Annotation.Root({
    messages: Annotation({ reducer: (left, right) => left.concat(right), default: () => [] }),
    loopCount: Annotation({ reducer: (left, right) => right, default: () => 0 })
});

const agentNode = async (state) => {
    console.log(`\n--- [Reasoning Step #${state.loopCount + 1}] ---`);
    
    const response = await client.chat.completions.create({
        model: process.env.AGENT_LLM_MODEL_NAME,
        messages: state.messages,
        tools: toolsSpec,
        tool_choice: "auto",
        reasoning_format: "hidden",
        temperature: 0.6
    });

    return { 
        messages: [response.choices[0].message], 
        loopCount: state.loopCount + 1 
    };
};

const executeToolsNode = async (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    const toolMessages = [];
    let batchAborted = false;

    for (const toolCall of lastMessage.tool_calls || []) {
        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        let payload = {
            tool: toolName,
            status: "pending",
            message: "",
            data: null
        };

        if (batchAborted) {
            payload.status = "aborted";
            payload.message = "Skipped because a previous action was blocked or failed.";
            toolMessages.push({ role: "tool", tool_call_id: toolCall.id, name: toolName, content: JSON.stringify(payload) });
            continue;
        }

        if (toolName === "search") {
            console.log(`Agent searching for: "${args.query}"`);
            const searchResults = await search(args.query, args.searchDepth || "basic");

            payload.status = "success";
            payload.message = "Web search completed.";
            payload.data = searchResults;
            
        } else if (toolName === "executeCMD") {
            console.log(`Agent requests: "${args.command}"`);
            const evaluation = await commandRiskClassifier(args.command);
            console.log(`Risk: ${evaluation.risk.toUpperCase()} | Reason: ${evaluation.reason}`);

            let isApproved = true;
            let humanFeedback = "Auto-approved (Safe Command).";
            const needsPermission = evaluation.requiresPermission || ["medium", "high", "critical"].includes(evaluation.risk);

            if (needsPermission) {
                console.log(`ACTION REQUIRED: Human authorization needed.`);
                const input = (await askHuman(`Allow execution? (y/n/provide feedback): `)).toLowerCase();

                if (input === 'y' || input === 'yes') {
                    isApproved = true;
                    humanFeedback = "Approved by human.";
                } else if (input === 'n' || input === 'no') {
                    isApproved = false;
                    humanFeedback = "Rejected by human.";
                } else {
                    isApproved = false;
                    humanFeedback = `Rejected. Human feedback: "${input}"`;
                }
            }

            if (!isApproved) {
                console.log(`Command aborted.`);
                payload.status = "blocked";
                payload.message = "Command was blocked by human. Read feedback and adjust.";
                payload.data = { risk: evaluation.risk, feedback: humanFeedback };
                batchAborted = true;
            } else {
                try {
                    const { stdout, stderr } = await executeCMD(args.command);
                    console.log(`Execution complete.`);
                    
                    payload.status = "success";
                    payload.message = "Command executed successfully.";
                    payload.data = {
                        risk: evaluation.risk,
                        feedback: humanFeedback,
                        stdout: truncateOutput(stdout),
                        stderr: truncateOutput(stderr)
                    };
                } catch (err) {
                    console.log(`Execution failed: ${err.message}`);
                    
                    payload.status = "error";
                    payload.message = `Command failed to execute: ${err.message}`;
                    payload.data = { risk: evaluation.risk, feedback: humanFeedback };
                    batchAborted = true;
                }
            }
        }

        toolMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolName,
            content: JSON.stringify(payload)
        });
    }

    return { messages: toolMessages };
};

const shouldContinue = (state) => {
    if (state.loopCount >= 10) {
        console.log("\nCircuit Breaker Triggered.");
        return END;
    }
    return state.messages[state.messages.length - 1].tool_calls?.length > 0 ? "execute_tools" : END;
};

export const agentApp = new StateGraph(AgentState)
    .addNode("agent", agentNode)
    .addNode("execute_tools", executeToolsNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, { "execute_tools": "execute_tools", [END]: END })
    .addEdge("execute_tools", "agent")
    .compile();