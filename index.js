const express = require("express");
const app = express();
const cors = require("cors");

const Lead = require("./models/leads.models");
const SalesAgent = require("./models/salesAgent.models");
const Comment = require("./models/comments.models");
const Tag = require("./models/tag.models");
const {initializeDatabase }= require("./DB/DB.Connect");
const { default: mongoose } = require("mongoose");


app.use(express.json())
initializeDatabase();

const corsOptions = {
  origin: "*",
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));


// ............... SalesAgents Routes ..........//

//1. Create New SalesAgent.

async function createNewSalesAgent(newAgent) {
    try{
        const existingAgent = await SalesAgent.findOne({email: newAgent.email})
        if(existingAgent){
            return { error: "Sales agent with this email already exists.", code: 409}
        }
        
        const agent = new SalesAgent(newAgent);
        const saveSalesAgent = await agent.save();
        return saveSalesAgent;
    } catch(error){
        console.log(error)
    }
}


app.post("/agents", async(req, res) => {
    try{
        const { name,email} = req.body;
        if(!name || typeof name !== "string"){
            return res.status(400).json({ error: "Invalid input: 'name' is required and must be a string." })
        }
        if(!email || !/\S+@\S+\.\S+/.test(email)){
            return res.status(400).json({error: "Invalid input: 'email' must be a valid email address." })
        }

        const result = await createNewSalesAgent({ name, email})

        if(result?.error){
            return res.status(result.code).json({error: result.error})
        }

        res.status(201).json({
            id: result._id,
            name: result.name,
            email: result.email,
            createdAt: result.createdAt,
        })
    }catch(error){
        res.status(500).json({error: "Failed to create new lead."})
    }
})

//2. Get list of sales agents.
async function readAllSalesAgent() {
    try{
        const allAgents = await SalesAgent.find();
        return allAgents;

    }catch(error){
        console.log(error)
    }
}
app.get("/agents", async(req, res) => {
    try{
        const salesAgents = await readAllSalesAgent();
        if(salesAgents.length > 0){
            res.json(salesAgents)
        }else{
            res.status(404).json({message: "Sales Agent Not Found."})
        }

    }catch(error){
        res.status(500).json({error: "Failed to fetch sales agents."})
    }
});

// 3. Delete a Sales Agent
async function deleteSalesAgent(agentId) {
  try {
    const deletedAgent = await SalesAgent.findByIdAndDelete(agentId);
    return deletedAgent;
  } catch (error) {
    console.log(error);
  }
}


app.delete("/agents/:agentId", async (req, res) => {
  try {
    const { agentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(404).json({ error: "Invalid Agent ID format." });
    }

    console.log(agentId);
    const deletedAgent = await deleteSalesAgent(agentId);

    if (!deletedAgent) {
      return res.status(404).json({ error: `Agent with ID '${agentId}' not found.` });
    }

    res.status(200).json({ message: "Agent deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete the agent." });
  }
});


// --------------- Leads Routes ------------------

//1. Create new lead.
async function createNewLead(newLead){
    try{
        const lead = new Lead(newLead);
        const saveLeads = await lead.save();
        return saveLeads;
    }catch(error){
        console.log(error);
    }
}
app.post("/leads", async(req, res) => {
    try{
        const { name, id, source, status, salesAgent, timeToClose, priority, tags } = req.body;
        console.log("Request Body:", req.body);

        if(!name || typeof name !== "string"){
            return res.status(400).json({error: "Invalid input: 'name' is required."})
        }

        const validSources = ["Referral", "Website", "Cold Call", "Advertisement", "Email", "Other"];
        const validStatuses = ["New", "Contacted", "Qualified", "Proposal Sent", "Closed"];
        const validPriorities = ["High", "Medium", "Low"];

        if(source && !validSources.includes(source)){
            return res.status(400).json({error: `Invalid source. Valid option: ${validSources.join(", ")}`})
        }

        if(status && !validStatuses.includes(status)){
            return res.status(400).json({error: `Invalid status. Valid option: ${validStatuses.join(", ")}`})
        }

        if(priority && !validPriorities.includes(priority)){
            return res.status(400).json({error: `Invalid priority. Valid option: ${validPriorities.join(", ")}`})
        }

        let existingSalesAgent = null;
        if (salesAgent) {
            if (!mongoose.Types.ObjectId.isValid(salesAgent)) {
                return res.status(400).json({ error: "Invalid Sales Agent ID format." });
      }
        existingSalesAgent = await SalesAgent.findById(salesAgent);
        if (!existingSalesAgent) {
         return res.status(404).json({ error: `Sales agent with ID '${salesAgent}' not found.` });
      }
    }

        const newLead = await createNewLead({
            name,
            source,
            status,
            salesAgent,
            timeToClose,
            priority,
            tags,
        })
        res.status(201).json({
            id: newLead._id,
            name: newLead.name,
            source: newLead.source,
            status: newLead.status,
            salesAgent: newLead.salesAgent,
            tags: newLead.tags,
            timeToClose: newLead.timeToClose,
            priority: newLead.priority,
            createdAt: newLead.createdAt,
        })

    }catch(error){
        res.status(500).json({error: "Failed to create new lead."})
    }
})

//2. Get All Leads.
app.get("/leads", async(req, res) => {
    try{
        const { source, salesAgent, status, tags} = req.query;

        const validSources = ['Website', 'Referral', 'Cold Call', 'Advertisement', 'Email', 'Other'];
        const validStatuses = ["New", "Contacted", "Qualified", "Proposal Sent", "Closed"];

        const filter = {};

        if(salesAgent){
            const mongoose = require("mongoose");
            if(!mongoose.Types.ObjectId.isValid(salesAgent)){
                return res.status(400).json({ error: "Invalid input: 'salesAgent' must be a valid ObjectId." })
            }
            filter.salesAgent = salesAgent;
        }

        if(source){
            if(!validSources.includes(source)){
                return res.status(400).json({ error:`Invalid input: 'source' must be one of ['${validSources.join("', '")}'].` })
            }
            filter.source = source;
        }

        if(status){
            if(!validStatuses.includes(status)){
                return res.status(400).json({error:`Invalid input: 'status' must be one of ['${validStatuses.join("', '")}'].` })
            }
            filter.status = status
        }

        if(tags){
            const tagList = tags.split(", ").map((tag) => tag.trim());
            filter.tags = {$in: tagList}
        }


        const leads = await Lead.find(filter).populate("salesAgent", "name _id")

        if(leads.length === 0){
            return res.status(404).json({message: "No leads found matching your criteria."})
        }


        const formateLeads = leads.map((lead) => ( {
            id: lead._id,
            name: lead.name,
            source: lead.source,
            salesAgent: lead.salesAgent
            ? {id: lead.salesAgent._id, name: lead.salesAgent.name} : null,
            status: lead.status,
            tags: lead.tags || [],
            timeToClose: lead.timeToClose,
            priority: lead.priority,
            createdAt: lead.createdAt,
        } ))

        res.status(200).json(formateLeads)
    }catch(error){
        res.status(500).json({error: "Failed to get all leads."})
    }
})

//3. Update Lead.
app.put("/leads/:id", async(req,res) => {
    try{
        const { id } = req.params;
        const {
            name,
            source,
            salesAgent,
            tags,
            timeToClose,
            status,
            priority,
        } = req.body;
        if(!mongoose.Types.ObjectId.isValid(id)){
            return res.status(404).json({error: "Invalid lead ID."})
        }

        const lead = await Lead.findById(id);
        if(!lead){
           return res.status(404).json({error: `Lead with ID '${id}' not found.`})
        }

        lead.name = name,
        lead.source = source,
        lead.status = status,
        lead.salesAgent = salesAgent,
        lead.tags = tags,
        lead.timeToClose = timeToClose,
        lead.priority = priority,
        lead.updatedAt = new Date();

        await lead.save();

        const updatedLead = await Lead.findById(id).populate("salesAgent", "id name");

        res.json({
            id: updatedLead.id,
            name: updatedLead.name,
            source: updatedLead.source,
            salesAgent:{
                id: updatedLead.salesAgent._id,
                name: updatedLead.salesAgent.name,
            },
            status: updatedLead.status,
            tags: updatedLead.tags,
            timeToClose: updatedLead.timeToClose,
            priority: updatedLead.priority,
            updatedAt: updatedLead.updatedAt,
        });
    } catch(error){
        res.status(500).json({error: "Failed to update the lead."})
    }
});

//4. d. Delete a Lead.
async function deleteLead(deleteId){
    try{
        const deletedLead = await Lead.findByIdAndDelete(deleteId);
        return deletedLead;
    }catch (error){
        console.log(error)
    }
}

app.delete("/leads/:deleteId", async(req,res) => {
    try{
        const { deleteId } = req.params;

        if(!mongoose.Types.ObjectId.isValid(deleteId)){
            return res.status(404).json({error: "Invalid Lead ID format." })
        }

        const deletedLead = await deleteLead(deleteId)

        if(!deletedLead){
            return res.status(404).json({error: `Lead with ID '${deleteId}' not found.`})
        }

        res.status(200).json({message: "Lead deleted successfully."})
    } catch(error){
        res.status(500).json({error: "Failed to delete the lead."})
    }
})

// Get a single lead by ID
app.get("/leads/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid lead ID." });
    }

    const lead = await Lead.findById(id).populate("salesAgent", "name _id");

    if (!lead) {
      return res.status(404).json({ error: `Lead with ID '${id}' not found.` });
    }

    const formattedLead = {
      id: lead._id,
      name: lead.name,
      source: lead.source,
      salesAgent: lead.salesAgent
        ? { id: lead.salesAgent._id, name: lead.salesAgent.name }
        : null,
      status: lead.status,
      tags: lead.tags || [],
      timeToClose: lead.timeToClose,
      priority: lead.priority,
      createdAt: lead.createdAt,
    };

    res.status(200).json(formattedLead);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch lead details." });
  }
});

// ----------------- Comment's Routes -----------------//

//1. Add a Comment to a Lead.

app.post("/leads/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { commentText, author } = req.body;

    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid Lead ID." });
    }

    
    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ error: `Lead with ID '${id}' not found.` });
    }

    
    if (!commentText || typeof commentText !== "string") {
      return res.status(400).json({
        error: "commentText is required and must be a string.",
      });
    }

    
    if (!author || !mongoose.Types.ObjectId.isValid(author)) {
      return res.status(400).json({
        error: "Author must be a valid SalesAgent ObjectId.",
      });
    }

    
    const salesAgent = await SalesAgent.findById(author);
    if (!salesAgent) {
      return res.status(404).json({
        error: `SalesAgent with ID '${author}' not found.`,
      });
    }

    
    const newComment = await Comment.create({
      lead: id,
      author: author,
      commentText,
    });

    
    const populatedComment = await Comment.findById(newComment._id)
      .populate("author", "name");

    res.status(201).json(populatedComment);

  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to add comment." });
  }
});


//2. Get all comments.

app.get("/leads/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;

    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid Lead ID." });
    }

    
    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({
        error: `Lead with ID '${id}' not found.`,
      });
    }

    
    const comments = await Comment.find({ lead: id })
      .populate("author", "name")   
      .sort({ createdAt: -1 });    

    res.status(200).json(comments);

  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to get comments." });
  }
});



// ----------- Report Routes ----------//

//1. Get last week's report.
app.get("/report/last-week", async(req, res) => {
    try{
     const now =  new Date();
     const lastWeek = new Date();
     lastWeek.setDate(now.getDate() - 7);

     const closedLead = await Lead.find({
        status: "Closed",
        updatedAt: {$gte: lastWeek, $lte: now}
     }).populate( "salesAgent", "name")

     if(!closedLead.length){
        return res.status(404).json({message: "No lead closed in the last week."})
     }

     const formattedLead = closedLead.map((lead) => ({
        id: lead._id,
        name: lead.name,
        salesAgent: lead.salesAgent ? lead.salesAgent.name : "Unknown",
        closedAt: lead.updatedAt,
     }));

     res.status(201).json(formattedLead)
    }catch (error){
        res.status(500).json({error: "Failed to get last week's report."})
    }
});

//---------Get lead in Pipeline----------//
 app.get("/report/pipeline", async(req, res) => {
    try{
      const newCount = await Lead.countDocuments({status: "New"})
      const contactCount = await Lead.countDocuments({ status: "Contacted"})
      const qualifiedCount = await Lead.countDocuments({status: "Qualified"})
      res.status(200).json({
        new: newCount,
        contacted: contactCount,
        qualified: qualifiedCount,
      })
    }catch(error){
        res.status(500).json({error: "Failed to get leads in pipeline."})
    }
 })

 //Total Closed vs Pipeline
 app.get("/report/closed-vs-pipeline", async(req,res) => {
    try{
       const closed = await Lead.countDocuments({status: "Closed"})
       const pipeline = await Lead.countDocuments({ status: { $ne: "Closed"} });

       res.status(200).json({closed, pipeline})
    }catch(error){
        res.status(500).json({error: "Failed to get closed vs pipeline data."})
    }
 })

//losed Leads by Sales Agent
app.get("/report/closed-by-agent", async(req, res) => {
    try{
        const closedLeads = await Lead.aggregate([
            { $match: { status: "Closed"}},
            {
                $group: {
                    _id: "$salesAgent",
                    totalClosed:  { $sum: 1}
                }
            },
            {
                $lookup: {
                    from: "salesAgent",
                    localField: "_id",
                    foreignField: "_id",
                    as: "agent"
                }
            },

            { $unwind: "$agent"},

            {
                $project: {
                    _id: 0,
                    agentName: "$agent.name",
                    totalClosed: 1
                }
            }
        ]);

        res.status(200).json(closedLeads)

    }catch(error){
        res.status(500).json({error: "Failed to get closed lead by agent."})
    }
})

//Lead Status Distribution
app.get("/report/status-distribution", async(req, res) => {
    try{
        const result = await Lead.aggregate([
            {
                $group: { 
                    _id: "$status",
                    count: { $sum: 1}
                }
            }
        ]);

        res.status(200).json(result);

    }catch(error){
        res.status(500).json({error: "Failed to get lead status distribution."})
    }
})

const PORT = 3000;
app.listen(PORT, () => {
   console.log(`Server is running on port ${PORT}`)
});