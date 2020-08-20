const http = require("http");

const getArgv = require("../functions/getArgv");
const { firstUpper } = require("../functions/stringFunctions");

module.exports = class App {
  constructor() {
    this._port = Number(getArgv("p")) || 3000;
  }

  startHttp(callback) {
    this._server = http.createServer(this.onRequest.bind(this));
    this._server.listen(this._port, () => {
      if (typeof callback === "function") {
        callback(this._port);
      }
    });
  }

  /* events */
  onRequest(req, resp) {
    const url = req.url;

    const parts = url.split("/");

    const controller = firstUpper(parts[1]) + "Controller";
    const method = parts[2] || "index";

    try {
      const controllerClass = require("./controllers/" + controller);

      const controllerObj = new controllerClass(req, resp);
      controllerObj[method]();
    } catch (e) {
      resp.writeHead(404);
      resp.end();
    }
  }
};
