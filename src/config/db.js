const mongoose = require('mongoose')

const connectDB = async()=>{
    try{
        mongoose.set('strictQuery',false)
        const connect = await mongoose.connect(process.env.MONGODB_URI)
        console.log(`Database Connected : ${connect.connection.host}`);
    }catch(error){

    }
}

module.exports =connectDB;