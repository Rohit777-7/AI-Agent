import mongoose from "mongoose";

const Connectdb= async ()=>{
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");
    }catch(error){
        console.log("Mongodb not connected", error);        
    }
}
export default Connectdb;