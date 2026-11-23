import mongoose from "mongoose";

// One counter per key and time window; MongoDB deletes it after expiresAt.
const rateLimitSchema = new mongoose.Schema({
    key:{
        type:String,
        required:true,
        unique:true
    },
    count:{
        type:Number,
        default:0
    },
    expiresAt:{
        type:Date,
        required:true
    }
});

rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateLimit = mongoose.model("RateLimit", rateLimitSchema);

export default RateLimit;
