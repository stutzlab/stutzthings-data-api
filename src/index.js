#!/usr/bin/env node

const logger = require("./logger.js");
logger.level = "debug";

const hostPrefix = process.env.API_HOST_PREFIX || "http://api.devices.stutzthings.com";
const mqttServerUrl = process.env.MQTT_SERVER_URL || "mqtt://mqtt.devices.stutzthings.com:1883";
const prefixPathMqttBridge = process.env.MQTT_PREFIX_PATH || "/v1/{account_id}/{device_id}/{device_instance_topics*}";

logger.info("Starting StutzThings API");
logger.info("");
logger.info("hostPrefix: " + hostPrefix);
logger.info("mqttServerUrl: " + mqttServerUrl);
logger.info("prefixPathMqttBridge: " + prefixPathMqttBridge);
logger.info("");

var Hapi = require("hapi");
var server = new Hapi.Server();

server.connection({port: 3000});

//MQTT REST BRIDGE
const restMqttBridge = require("./rest-mqtt-route.js");
restMqttBridge.init(server, mqttServerUrl, prefixPathMqttBridge);

//DEVICE REGISTRATION ENDPOINT
server.route({
  method: "POST",
  path: "/v1/{account_id}/{device_id}",
  handler: function(req, reply) {
    logger.debug("Registering new device instance");
    logger.debug("account_password="+ req.payload.account_password + "; custom_name=" + req.payload.custom_name);
    //FIXME fake for now. implement!
    //TODO use https://github.com/krakenjs/swaggerize-hapi in the future

    const username = req.params.account_id;
    const password = req.payload.account_password;
    const custom_name = req.payload.custom_name;
    const hardware_id = req.payload.hardware_id;
    const device_id = req.params.device_id;

    if(username=="some" && password=="one" && device_id=="tracker") {
      const randomId = Math.floor((Math.random() * 999999) + 1);
      const deviceInstance = {
        id: randomId,
        hardware_id: hardware_id,
        custom_name: custom_name,
        access_token: JSON.stringify({client_id:randomId, scopes: ["i:"+randomId+":wr"]}),
        mqtt: {
          host: "mqtt.stutzthings.com",
          port: 1883,
          ssl: false,
          base_topic: "v1/"+ req.params.account_id +"/"+ req.params.device_id +"/" + randomId
        },
        ota: {
          enabled: true,
          host: "ota.stutzthings.com",
          port: 80,
          path: "/ota/tracker",
          ssl: false,
        }
      };
      reply(deviceInstance)
        .code(201)
        .header("Location", hostPrefix + "/v1/" + req.params.account_id + "/" + req.params.device_id + "/" + randomId)
        .header("Content-Type", "application/json");

    } else {
      reply({message:"Invalid account/password/device_id"})
        .code(401)
        .header("Content-Type", "application/json");
    }
  }
});

server.route({
  method: "POST",
  path: "/v1/test",
  handler: function(req, reply) {
    console.log("Just received /v1/test POST");
    console.log(req.payload);
    reply("OK");
  }
});

server.route({
  method: "*",
  path: "/{p*}",
  handler: function (req, reply) {
    return reply({message:"Resource not found"}).code(404);
  }
});

server.start(function(){ // boots your server
  console.log("stutzthings-api started on port 3000");
});

module.exports = server;
