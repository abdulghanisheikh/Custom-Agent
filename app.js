import { StateGraph,MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { config } from "dotenv";
import readline from "readline/promises";
import { ChatGroq } from "@langchain/groq";
import { TavilySearch } from "@langchain/tavily";
import { MemorySaver } from "@langchain/langgraph";
config();

//Here, TravilySearch is used to enable web-search
const webSearch=new TavilySearch({
    apiKey:process.env.TRAVILY_API_KEY,
    maxResults:3,
    topic:"general"
});
const tools=[webSearch]; //Tools such as web-search, DB, etc
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
    const toolCalls=state.messages[state.messages.length-1].tool_calls;
    if(toolCalls.length>0) return "tools";
    else return "__end__";
}

//Making workflow using StateGraph
const workflow=new StateGraph(MessagesAnnotation)
    .addNode("tools",toolNode)
    .addNode("agent",callModel)
    .addEdge("__start__","agent") //start->agent
    .addConditionalEdges("agent",shouldContinue) //agent->tools OR agent->end
    .addEdge("tools","agent"); //tools->agent
    
const checkpointer=new MemorySaver();
const graph=workflow.compile({ checkpointer });

async function main(){
    const rl=readline.createInterface({
        input:process.stdin,
        output:process.stdout
    });
    while(true){
        const userInput=await rl.question("You: ");
        if(userInput==="/bye") break;
        const finalState=await graph.invoke({
            messages:[{
                role:"user",
                content:userInput
            }]
        },{
            configurable:{thread_id:"1"} //This is my conversation id
        });
        const {content}=finalState.messages[finalState.messages.length-1];
        console.log("Agent: ",content);
    }
    rl.close();
}
main();