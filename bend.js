import express from "express";
import morgan from "morgan";
import mongoose from "mongoose";
import cors from "cors";
import {verifyFirebaseToken} from "./middleware/auth.js";
import admin from "./firebase-admin.js";
import dotenv from "dotenv";


const app = express();
dotenv.config();
app.use(cors({
    origin: "https://tdl-portfolio-frontend.vercel.app",
    credentials: true
}));
app.use(morgan("dev"));
app.use(express.json());

export const ConnectorDB = async () =>{
    try{
        await mongoose.connect(process.env.MONGO_URL);
        mongoose.set('bufferCommands', false);
        mongoose.set("strictQuery", true);
        console.log("DB connected");
    }catch(err){
        console.log("Error: ", err);
        process.exit();
    }
};
ConnectorDB().then(
        app.listen(process.env.PORT, ()=>{
        console.log("Something");
    })
);

const userDBSchema = new mongoose.Schema(
    {
        firebaseUid: {type: String, required: true, unique: true},
        username: {type: String, required: true, minLength: 4, maxLength: 20},
        email: {type: String, required: true}
    },
    {
        timestamps: {createdAt: 'UserCreatedAt', updatedAt: 'UserDataChanged'}
    }
)

const toDoSchema = new mongoose.Schema(
    {
        userId: {type: String, required: true},
        taskName: {type: String, required: true},
    },
    {
        timestamps: {createdAt: 'TaskCreatedAt', updatedAt: 'TaskChangedAt'}
    }
)

export const User = mongoose.model("User", userDBSchema);
export const ToDoList = mongoose.model("ToDoList", toDoSchema);



app.post("/api/register", async (req, res) =>{

    const {firebaseUid, username, email} = req.body;

    try{
        const user = new User(
        {
            firebaseUid,
            username,
            email
        }
    );

    await user.save();
    res.json(user);

    }catch(err){
        res.status(500).json(err);
    }
});

app.get("/api/protected", verifyFirebaseToken, (req, res) => {
  res.json({ message: "You are authorized", user: req.user });
});

app.get("/api/user", verifyFirebaseToken, async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }else{
            res.json(user);
        }
        
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

app.get("/api/tasks", verifyFirebaseToken, async (req, res) => {
  try {
    const tasks = await ToDoList.find({ userId: req.user.uid });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to get tasks" });
  }
});

app.post("/api/tasks", verifyFirebaseToken, async (req,res) =>{
    try{
        const {tasks} = req.body;
        await ToDoList.deleteMany({userId: req.user.uid});

        const tasksSave = tasks.filter(task => task.trim() !== "").map(task =>({
            userId: req.user.uid,
            taskName: task
        }));

        await ToDoList.insertMany(tasksSave);
        res.json({message: "Tasks saved"});
    }catch(err){
        console.log(err);
        res.status(500).json({error: "Faild to save data"});
    }
});

app.post("/api/deleteAccount", verifyFirebaseToken, async (req,res)=>{
    try{
        const uid  = req.user.uid;
        
        await ToDoList.deleteMany({userId: uid});
        await User.deleteOne({firebaseUid: uid});
        await admin.auth().deleteUser(uid);

        res.json({message: "Test user data delated mongo"});
    }catch(err){
        console.log(err);
        res.status(500).json({error: "Faild to delete data"});
    }
})

