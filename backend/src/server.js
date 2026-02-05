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

//Route imnport
const boardRoutes = require("./routes/boardRoutes");
const listRoutes = require("./routes/listRoutes");
const cardRoutes = require("./routes/cardRoutes");
const timeLogRoutes = require("./routes/timeLogRoutes");

//Route mounting
app.use("/api/boards", boardRoutes);
app.use("/api/lists", listRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/timelogs", timeLogRoutes);
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
