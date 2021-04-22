const fs       = require('fs'),
      rootPath = require('app-root-path').path,
      path     = require('path'),
      cors     = require('cors'),
      config   = require(path.join(rootPath, 'src', 'config.js'));

const modelLoader = (models, app, dependencies) => {
    models.forEach((modelFunction) => {
        const Model = modelFunction(dependencies.sequelize);
        const modelName = new Model().constructor.name;
        dependencies.models[modelName] = Model;
    });
}

module.exports = modelLoader;