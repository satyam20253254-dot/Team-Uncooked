// import mongoose from "mongoose"

// const connectDB = async ()=>{
//     try{
//         const connectionInstance = await mongoose.connect(process.env.MONGO_URI)
//         console.log(`\nMongoDB connected !! DB Host:${connectionInstance.connection.host}`)
//         console.log(`Database: ${connectionInstance.connection.name}`)
//     }
//     catch(error){
//         console.log("MONGODB connection failed", error);
//         process.exit(1);
//     }
// }

// export default connectDB


import dns from "node:dns";
import mongoose from "mongoose";

if (process.env.USE_GOOGLE_DNS === "true") {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
}


const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      `MongoDB connected! DB Host: ${connectionInstance.connection.host}`
    );
    console.log(
      `Database: ${connectionInstance.connection.name}`
    );

    return connectionInstance;
  } catch (error) {
    console.error("MONGODB connection failed:", error);
    throw error;
  }
};

export default connectDB;
