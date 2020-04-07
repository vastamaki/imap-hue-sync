const notifier = require("mail-notifier"),
  moment = require("moment"),
  v3 = require("node-hue-api").v3,
  sleep = require("sleep"),
  LightState = v3.lightStates.LightState,
  LIGHT_ID = 1,
  { username, password, hue_username } = require("./secrets.json"),
  timeFormat = "hh:mm:ss",
  time = moment(moment(), timeFormat),
  beforeTime = moment("08:00:00", timeFormat),
  afterTime = moment("22:00:00", timeFormat),
  imap = {
    user: username,
    password: password,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    markSeen: false,
  };

(async () => {
  const api = await v3.discovery.nupnpSearch().then((searchResults) => {
    const host = searchResults[0].ipaddress;
    return v3.api.createLocal(host).connect(hue_username);
  });
  notifier(imap)
    .on("connected", () => console.log(`Started listening ${username}`))
    .on("end", () => n.start())
    .on("mail", () => handler())
    .start();

  const handler = async () => {
    console.log("New mail received, triggering lights");
    if (time.isBetween(beforeTime, afterTime)) {
      console.log("Current time is between awake hours, triggering lights");
      const light_status = await getLightStatus();
      const brightness = light_status
        ? [0, 100, 0, 100, 0, 100]
        : [100, 0, 100, 0, 100, 0];
      await asyncForEach(brightness, async (value) => {
        sleep.sleep(1);
        await blinkLight(value, api);
      });
    } else {
      console.log(
        "Current time is not between awake hours, not triggering lights"
      );
    }
  };

  const getLightStatus = async () => {
    const status = await api.lights.getLightState(LIGHT_ID);
    if (status.on == true) return true;
    return false;
  };

  const blinkLight = async (brightness, api) => {
    let state;
    if (brightness == 0) {
      state = new LightState().off();
    } else {
      state = new LightState().on().brightness(brightness);
    }
    return api.lights.setLightState(LIGHT_ID, state);
  };

  const asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  };
})();
