import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import dotenv from "dotenv";
import readline from "readline/promises";
import { ChatGroq } from "@langchain/groq";
import {TavilySearch} from "@langchain/tavily";

dotenv.config();
const tool=new TavilySearch({
    apiKey:process.env.TRAVILY_API_KEY,
    maxResults:3,
    topic:"general"
});
const tools=[tool]; //web search, DB, etc.
const toolNode=new ToolNode(tools);

const llm=new ChatGroq({
    apiKey:process.env.GROQ_API_KEY,
    model:"openai/gpt-oss-120b",
    temperature:0,
    maxRetries:2
}).bindTools(tools);

async function callModel(state){ //state is just mantaining the array of conversation between User and AI
    const response=await llm.invoke(state.messages);
    return { messages:[response] }; //state updated with the AI message
}

//Condition for conditional edge
function shouldContinue(state){
    const res=state.messages[1].content;
    if(res==="") return "tools";
    else return "__end__";
}

//Making graph/workflow using StateGraph
const workflow=new StateGraph(MessagesAnnotation)
    .addNode("tools",toolNode)
    .addNode("agent",callModel)
    .addEdge("__start__","agent")
    .addEdge("agent","__end__")
    .addConditionalEdges("agent",shouldContinue);
const agent=workflow.compile();

async function main(){
    const rl=readline.createInterface({
        input:process.stdin,
        output:process.stdout
    });
    while(true){
        const userInput=await rl.question("You: ");
        if(userInput==="/bye") break;
        const finalState=await agent.invoke({
            messages:[{
                role:"user",
                content:userInput 
            }]
        });
        const lastMessage=finalState.messages[finalState.messages.length-1];
        const {content}=lastMessage
        console.log("AI: ",content);
    }
    rl.close();
}
main();