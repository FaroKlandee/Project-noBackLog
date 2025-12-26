//Environment variable load
require("dotenv").config();

//Packages
const express = require("express");
const connectDB = require("./config/database");
const cors = require("cors");

//Initialise express app
const app = express();

//Port config
const PORT = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.use(express.json());

//Routes
app.get("/", (req, res) => {
  res.json({ message: "NoBackLog API is running..." });
});

// Start server
const startServer = async () => {
  await connectDB(); //Connecting to db first
  app.listen(PORT, () => {
    console.log(`Listening at http://localhost:${PORT}`);
  });
};

startServer();
