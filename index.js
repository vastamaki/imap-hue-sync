const notifier = require("mail-notifier");
const moment = require("moment");
const v3 = require("node-hue-api").v3;
var sleep = require("sleep");
const LightState = v3.lightStates.LightState;
const LIGHT_ID = 1;
const { username, password, hue_username } = require("./secrets.json");
const timeFormat = "hh:mm:ss";
const time = moment(moment(), timeFormat);
const beforeTime = moment("08:00:00", timeFormat);
const afterTime = moment("22:00:00", timeFormat);

(async () => {
  if (time.isBetween(beforeTime, afterTime)) {
    console.log("is between");
  } else {
    console.log("is not between");
  }
  const api = await v3.discovery.nupnpSearch().then((searchResults) => {
    const host = searchResults[0].ipaddress;
    return v3.api.createLocal(host).connect(hue_username);
  });

  const imap = {
    user: username,
    password: password,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    markSeen: false,
  };

  notifier(imap)
    .on("connected", () => console.log(`Started listening ${username}`))
    .on("end", () => n.start())
    .on("mail", () => handler(api))
    .start();

  const handler = async (api) => {
    console.log("New mail received, triggering lights");
    const light_status = await getLightStatus();
    const brightness = light_status
      ? [0, 100, 0, 100, 0, 100]
      : [100, 0, 100, 0, 100, 0];
    await asyncForEach(brightness, async (value) => {
      sleep.sleep(1);
      await blinkLight(value, api);
    });
  };

  async function getLightStatus() {
    const status = await api.lights.getLightState(LIGHT_ID);
    if (status.on == true) return true;
    return false;
  }

  async function blinkLight(brightness, api) {
    let state;
    if (brightness == 0) {
      state = new LightState().off();
    } else {
      state = new LightState().on().brightness(brightness);
    }
    return api.lights.setLightState(LIGHT_ID, state);
  }

  async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }
})();
