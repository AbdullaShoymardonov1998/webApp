const express = require("express");
const cors = require("cors");
const { Sequelize } = require("sequelize");
const { Umzug, SequelizeStorage } = require("umzug");

const app = express();

const port = 3000;
app.use(express.json());
app.use(cors());

const sequelize = new Sequelize("postgres", "user", "password", {
  dialect: "postgres",
  host: "localhost",
  port: 5434,
});

const User = require("./src/user")(sequelize);
const umzug = new Umzug({
  migrations: { glob: "migrations/*.js" },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

async function applyMigrations() {
  try {
    await umzug.up();
    console.log("Migrations applied successfully");
    await User.sync();
  } catch (error) {
    console.error("Error applying migrations:", error);
    throw error;
  }
}

app.put("/update/:userId", async (req, res) => {
  const { amount } = req.body;
  const { userId } = req.params;
  try {
    const user = await User.findOne({
      where: {
        id: parseInt(userId),
      },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const newBalance = user.balance - parseInt(amount);

    if (newBalance < 0) {
      return res.status(400).json({ error: "Insufficient funds" });
    }

    await user.update({ balance: newBalance });

    return res.status(200).json({ message: "Balance updated successfully" });
  } catch (error) {
    console.error("Error updating balance:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

async function startApp() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully.");

    await applyMigrations();

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error(
      "Unable to connect to the database or apply migrations:",
      error
    );
  }
}

startApp();
