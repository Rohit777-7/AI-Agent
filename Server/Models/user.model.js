import mongoose from "mongoose";


const PageSchema = new mongoose.Schema(
    {
        name: String,

        path: String,

        keywords: {
            type: [String],
            default: [],
        }
    },
    {_id: false}
);

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    assistantName:{
        type:String,
        default:"ShifraAI"
    },
    bussinessName:{
        type:String,
        default:""
    },
    bussinessType:{
        type:String,
        default:""  
    },
    bussinessDescription:{
        type:String,
        default:""
    },
    tone:{
        type:String,
        enum:["Formal","Informal","Friendly","Professional"],
        default:"Friendly"
    },
    theme:{
    type:String,
    enum:["light","dark","glass","neon","ocean","sunset","rose","midnight"],
    default:"dark"
    },
    enablevoice:{
        type:Boolean,
        default:true
    },
    pages:{
        type:[PageSchema],
        default:[]   
        },
        enableNavigation:{
            type:Boolean,
            default:true
        },
        geminiApiKey:{
            type:String,
            default:""
        },
        geminiStatus:{
            type:String,
            enum:["active","inactive","invalid","quota_exceeded"],
            default:"active"
        },
        totalMessages:{
            type:Number,
            default:0
        },
        plan:{
            type:String,
            enum:["free","pro"],
            default:"free"  
        },
        requestLimit:{
            type:Number,
            default:200,
        },
        proExpiresAt:{
            type:Date,
            default:null
        },
        isSetupComplete:{
            type:Boolean,
            default:false
        }
},{timestamps:true});

const User = mongoose.model("User", userSchema);

export default User;