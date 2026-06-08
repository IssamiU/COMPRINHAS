import mongoose from "mongoose";

export async function connectMongo() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/mealsync";
  try {
    await mongoose.connect(uri);
    console.log("MongoDB conectado com sucesso.");
  } catch (error) {
    console.error("Erro ao conectar no MongoDB:", error);
    process.exit(1);
  }
}