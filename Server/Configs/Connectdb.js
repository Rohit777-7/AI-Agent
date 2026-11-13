// import mongoose from "mongoose";

// const Connectdb= async ()=>{
//     try {
//         await mongoose.connect(process.env.MONGO_URL);
//         console.log("Connected to MongoDB");
//     }catch(error){
//         console.log("Mongodb not connected", error);        
//     }
// }
// export default Connectdb;

import mongoose from "mongoose";

let cached = globalThis.mongooseCache;

if (!cached) {
  cached = globalThis.mongooseCache = {
    conn: null,
    promise: null
  };
}

const Connectdb = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is missing in environment variables");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URL, {
      bufferCommands: false
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log("Connected to MongoDB");
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};

export default Connectdb;
