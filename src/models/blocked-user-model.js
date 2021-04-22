const {Sequelize} = require('sequelize'),
      nacl      = require('tweetnacl');

class BlockedUserModel extends Sequelize.Model {};

module.exports = (sequelize) => {
    BlockedUserModel.init({
        combined_id: {
            primaryKey: true,
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        secret_id: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        }
    }, {sequelize, modelName: 'blocked_user', timestamps: false});

    return BlockedUserModel;
}