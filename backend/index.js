
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

// Import database and app after loading environment variables
const { default: connectDB } = await import("./db/index.js");
const { app } = await import("./app.js");

const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`⚙️ Server is running at port: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
    process.exitCode = 1;
  });
