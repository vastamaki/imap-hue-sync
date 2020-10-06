const notifier = require("mail-notifier"),
  setHours = require("date-fns/setHours"),
  isWithinInterval = require("date-fns/isWithinInterval"),
  v3 = require("node-hue-api").v3,
  sleep = require("sleep"),
  LightState = v3.lightStates.LightState,
  LIGHT_ID = 1,
  { username, password, hue_username } = require("./secrets.json"),
  n = notifier({
    user: username,
    password: password,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    markSeen: false,
  });

(async () => {
  const bridge = await v3.discovery.nupnpSearch();
  const host = bridge[0].ipaddress;
  const api = await v3.api.createLocal(host).connect(hue_username);

  n.start();

  n.on("connected", () => {
    console.log(`Started listening ${username}`);
    // Test handler
    handler();
  });
  n.on("mail", () => handler());

  n.on("end", () => {
    console.log("Reconnecting to imap server");
    n.start();
  });

  const handler = async () => {
    console.log("New mail received, checking time");
    const isBetweenAwakeHours = isWithinInterval(new Date(), {
      start: setHours(new Date(), 8),
      end: setHours(new Date(), 24),
    });
    if (isBetweenAwakeHours) {
      console.log("Current time is between awake hours, triggering lights");
      const light_status = await getLightStatus();
      for (let i = 0; i < 5; i++) {
        const dividable = i % 2 === 0;
        const value = light_status === dividable ? 100 : 0;
        await blinkLight(value, api);
        sleep.sleep(1);
      }
    } else {
      console.log(
        "Current time is not between awake hours, not triggering lights"
      );
    }
  };

  const getLightStatus = async () => {
    const status = await api.lights.getLightState(LIGHT_ID);
    if (status.on === true) return true;
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
})();
