const { StateGraph, MessagesAnnotation }=require("@langchain/langgraph");
const readline=require("readline/promises");

function callModel(state){
    console.log("calling LLM...");
    return state;
}

//Making graph/workflow using StateGraph
const workflow=new StateGraph(MessagesAnnotation)
    .addNode("agent",callModel)
    .addEdge("__start__","agent")
    .addEdge("agent","__end__");
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
        console.log("final: ",finalState);
    }
    rl.close();
}
main();