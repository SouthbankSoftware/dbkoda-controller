/* eslint-disable class-methods-use-this */

class DriverController {
  setup(app) {
    this.app = app;
  }

  patch(driver, data) {
    console.log(data);
    return driver.db(data.database).command(data.command);
  }
}

module.exports.DriverController = DriverController;
