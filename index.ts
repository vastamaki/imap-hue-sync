import * as dotenv from "dotenv";
dotenv.config();
import { v3 } from "node-hue-api";
const LightState = v3.lightStates.LightState;

const { HUE_USERNAME } = process.env;

const LIGHT_ID = 1;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const bridge = await v3.discovery.nupnpSearch();
const host = bridge[0].ipaddress;
const api = await v3.api.createLocal(host).connect(HUE_USERNAME);

const LIGHT_OFF = new LightState().off();
const LIGHT_ON = new LightState().on(true).brightness(100);

const handler = async () => {
  for (let i = 0; i < 5; i++) {
    const light_status = await api.lights.getLightState(LIGHT_ID);
    await api.lights.setLightState(
      LIGHT_ID,
      light_status.on ? LIGHT_OFF : LIGHT_ON
    );

    await sleep(1000);
  }
};

handler();
