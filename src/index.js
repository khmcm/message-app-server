/**
 * NOTE: HTTPS support is currently not enabled by default
 */

require('dotenv').config();

const express        = require('express'),
    app              = express(),
    cors             = require('cors'),
    path             = require('path'),
    rootPath         = require('app-root-path').path,
    config           = require(path.join(rootPath, 'src', 'config.js')),
    routeLoader      = require(path.join(rootPath, 'src', 'loaders', 'route-loader.js')),
    middlewareLoader = require(path.join(rootPath, 'src', 'loaders', 'middleware-loader.js')),
    modelLoader      = require(path.join(rootPath, 'src', 'loaders', 'model-loader.js')),
    {Sequelize}      = require('sequelize'),
    sequelize        = new Sequelize({
        dialect: 'sqlite',
        storage: config.dbSrc,
        logging: false
    }),
    modelsPath       = path.join(rootPath, 'src', 'models'),
    nacl             = require('tweetnacl');

const MAX_MESSAGE_EVENT_LISTENER_IDLE_TIME = 15000;

const signingKeyPair = nacl.box.keyPair();
const publicAsymmetricEncryptionKeyPair = nacl.sign.keyPair();

/** @type {{models: any[], messageEventListeners: any[], triggerMessageEvent: () => number}} */
const dependencies = {
    sequelize,
    models: {},
    messageEventListeners: [],
    triggerMessageEvent
}

/**
 * @param {Object} args
 * @param {string} args.type
 * @param {string} args.conversationId
 * @param {{[index]: any}} args.payload
 */
function triggerMessageEvent({type, payload, conversationId}) {
    dependencies.messageEventListeners
        .filter((listener) => listener.conversationId === conversationId)
        .forEach((listener) => {
            listener.callback({type, payload});
            listener.lastRaised = Date.now();
        })
}

setInterval(function() {
    dependencies.messageEventListeners.forEach((listener, index) => {
        //If the message event listener has existed for too
        //long without a ping from the client, delete it.
        if(Date.now() - listener.lastRaised > MAX_MESSAGE_EVENT_LISTENER_IDLE_TIME) {
           dependencies.messageEventListeners.splice(index, 1);
        }

        listener.callback({type: 'PING', payload:{}});
    })
}, 5000);


middlewareLoader(app);
routeLoader(app, dependencies);
modelLoader([
    require(path.join(modelsPath, 'client-data-model.js')),
    require(path.join(modelsPath, 'message-model.js')),
    require(path.join(modelsPath, 'user-model.js')),
    require(path.join(modelsPath, 'muted-user-model.js')),
    require(path.join(modelsPath, 'blocked-user-model.js')),
    require(path.join(modelsPath, 'contact-model.js'))
], app, dependencies);

/**
 * Setup the models' tables in the database.
 **/ 
//Object.keys(dependencies.models).forEach(modelName => dependencies.models[modelName].sync({alter: true}));


app.listen(8080);