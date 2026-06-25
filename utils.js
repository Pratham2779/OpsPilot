import readline from "readline";

export const askHuman = (query) => new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(query, answer => {
        rl.close();
        resolve(answer.trim());
    });
});

export const truncateOutput = (str) => 
    str.length > 2000 ? str.slice(0, 2000) + "\n...[TRUNCATED]" : str;

