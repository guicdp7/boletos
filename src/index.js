const App = require("./classes/App.js");

const app = new App();

app.startHttp((port) => {
  console.log("server started at port " + port);
});
