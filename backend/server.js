require("dotenv").config();
const app = require("./src/app");
const { port } = require("./src/config/app.config");

// Hostinger passes the assigned port via process.env.PORT dynamically.
// We fall back to app.config.js port or 3000 for local development.
const PORT = process.env.PORT || port || 3000;

app.listen(PORT, () => {
  console.log(`Brine & Shell API listening on port ${PORT}`);
});
