import mongoose from "mongoose";

export default function mongoCtx(){
    mongoose.connect(process.env.DB_CTX,{
        dbName:'saralbuy'
    })
    .then(() => {
        console.log("Connected to MongoDB 🚀");
    })
    .catch((error) => {
        console.error("Error connecting to MongoDB", error);
    });
}