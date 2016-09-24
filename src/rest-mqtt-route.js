const logger = require("./logger.js");
const mqtt = require("mqtt");

const READ_TOPIC_TIMEOUT = 5000;

module.exports.init = function(hapiServer, mqttServerUrl, basePath) {
  this.hapiServer = hapiServer;
  this.mqttServerUrl = mqttServerUrl;
  this.basePath = basePath;

  const get = {
    method: "GET",
    path: basePath,
    handler: function(req, reply) {
      logger.debug("GET " + req.path);

      //TODO connecting to mqttserver at each message may not be scalable,
      //but for now we are doing this so that we can use the same security
      //schema from mosquitto without having to duplicate this logic while we are small
      logger.debug("Connecting to " + mqttServerUrl);
      const client = mqtt.connect(mqttServerUrl, {username:req.headers.authorization});

      const topic = req.path.substring(1);
      var timeoutCode = 401;
      var timeoutMessage = "Error getting topic data " + topic;

      const timeoutTimer = setTimeout(function() {
        reply(timeoutMessage).header('Content-Type', "text/plain").code(timeoutCode);
        client.end();
        logger.debug("Disconnecting (t) from " + mqttServerUrl);
      }, READ_TOPIC_TIMEOUT);

      client.on("connect", function() {
        logger.debug("Connected to " + mqttServerUrl);

        client.on("message", function(topic, message, packet) {
          clearTimeout(timeoutTimer);
          logger.debug("Received '" + message.toString() + "' on '" + topic + "'");
          reply(message.toString()).header('Content-Type', "text/plain").code(200);
          client.end();
          logger.debug("Disconnecting (n) from " + mqttServerUrl);
        });

        client.subscribe(topic, {qos:2}, function(err, granted) {
          if(err) {
            logger.debug("Could not subscribe to " + topic + ". err=" + err);
            timeoutCode = 500;
            timeoutMessage = "Could not subscribe topic '" + topic + "'. err=" + err;
          } else {
            logger.debug("Subscribed to " + topic);
            timeoutCode = 204;
            timeoutMessage = "No data found for " + topic;
          }
        });
      });

    }
  }

  const post = {
    method: "POST",
    path: basePath,
    config: {payload: {parse:false}},
    handler: function(req, reply) {
      logger.debug("POST " + req.path + "; data=" + req.payload);
      logger.debug("Connecting to " + mqttServerUrl);
      const client = mqtt.connect(mqttServerUrl, {username:req.headers.authorization});
      const topic = req.path.substring(1);
      client.publish(topic, req.payload, {qos: 2, retain: true}, function() {
        logger.debug("Message "+ req.payload +" published (retained=true) to topic " + topic);
        client.end();
        logger.debug("Disconnecting from " + mqttServerUrl);
        reply("OK").header("content-type", "text/plain").code(201);
      });
    }
  }

  const put = {
    method: "PUT",
    path: this.basePath,
    config: {payload: {parse:false}},
    handler: function(req, reply) {
      logger.debug("PUT " + req.path + "; data=" + req.payload);
      logger.debug("Connecting to " + mqttServerUrl);
      const client = mqtt.connect(mqttServerUrl, {username:req.headers.authorization});
      const topic = req.path.substring(1);
      client.publish(topic, req.payload, {qos: 2, retain: false}, function() {
        logger.debug("Message "+ topic +" published (retained=false) to topic " + req.path);
        client.end();
        logger.debug("Disconnecting from " + mqttServerUrl);
        reply("OK").header("content-type", "text/plain").code(200);
      });
    }
  }

  const del = {
    method: "DELETE",
    path: this.basePath,
    handler: function(req, reply) {
      logger.debug("DELETE " + req.path);
      logger.debug("Connecting to " + mqttServerUrl);
      const client = mqtt.connect(mqttServerUrl, {username:req.headers.authorization});
      const topic = req.path.substring(1);
      client.publish(topic, "", {qos: 2, retain: true}, function() {
        logger.debug("Empty message published (retained=true) to topic " + req.path);
        client.end();
        logger.debug("Disconnecting from " + mqttServerUrl);
        reply("OK").header("content-type", "text/plain").code(201);
      });
    }
  }

  hapiServer.route(get);
  hapiServer.route(post);
  hapiServer.route(put);
  hapiServer.route(del);

  logger.info("REST<->MQTT bridge initialized");
}
