const {Sequelize} = require('sequelize'),
      nacl      = require('tweetnacl');

class ClientDataModel extends Sequelize.Model {};

module.exports = (sequelize) => {
    ClientDataModel.init({
        id: {
            primaryKey: true,
            type: Sequelize.DataTypes.STRING,
            defaultValue: () => Buffer.from(nacl.randomBytes(32)).toString('hex'),
            allowNull: false
        },
        data: {
            type: Sequelize.DataTypes.BLOB,
            allowNull: false
        }
    }, {sequelize, modelName: 'client_data', timestamps: false});

    return ClientDataModel;
}