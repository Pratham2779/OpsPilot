import OpenAI from "openai/index.js";
import dotenv from "dotenv";

dotenv.config();

export const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

