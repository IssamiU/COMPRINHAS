import mongoose from "mongoose";

export async function connectMongo() {
  try {
    await mongoose.connect("mongodb://localhost:27017/mealsync");

    console.log("MongoDB conectado com sucesso.");
  } catch (error) {
    console.error("Erro ao conectar no MongoDB:", error);
    process.exit(1);
  }
}