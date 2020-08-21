const url = require("url");

module.exports = class Controller {
  constructor(app, req, resp) {
    this.app = app;
    this.req = req;
    this.resp = resp;
  }

  reqQuery() {
    return url.parse(this.req.url, true).query;
  }

  respError(message, code) {
    const errorObj = {
      status: false,
      error: true,
      message: message,
      code: code,
    };
    this.respJson(errorObj);
  }

  respJson(data) {
    this.resp.setHeader("Content-Type", "application/json");
    this.resp.end(JSON.stringify(data, null, 3));
  }

  respSuccess(data) {
    const successObj = {
      status: true,
      error: false,
      data: data,
    };
    this.respJson(successObj);
  }
};
