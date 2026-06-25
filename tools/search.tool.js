import { tavily } from "@tavily/core";
import { config } from "dotenv";
config();


const client = tavily({ apiKey: process.env.TAVILY_API_KEY });



function search(query,searchDepth) {

    return client.search(query, {
        searchDepth:searchDepth
    });
}


export {
    search
};

