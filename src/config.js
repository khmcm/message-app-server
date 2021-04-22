const path     = require('path'),
      rootPath = require('app-root-path').path;

const config = {
    dbSrc: path.join(rootPath, '..', 'db.db'),
    allowedOrigins: process.env.ALLOWED_ORIGINS.split(','),
    maxProofTimeDelta: 1000 * 60,
    maxStatusLength: 200,
    maxDisplayNameLength: 40,
    minDisplayNameLength: 3,
    conversationIdLength: 32
}

config.corsOptions = {
    origin: (origin, callback) => {
        if(config.corsWhitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Origin not allowed'));
        }
    }
}

module.exports = config;