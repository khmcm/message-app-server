const {Sequelize} = require('sequelize'),
      nacl      = require('tweetnacl');

class MutedUserModel extends Sequelize.Model {};

module.exports = (sequelize) => {
    MutedUserModel.init({
        combined_id: {
            primaryKey: true,
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        secret_id: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        }
    }, {sequelize, modelName: 'muted_user', timestamps: false});

    return MutedUserModel;
}