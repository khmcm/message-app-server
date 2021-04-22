const {Sequelize} = require('sequelize'),
      nacl        = require('tweetnacl');

class ContactModel extends Sequelize.Model {};

module.exports = (sequelize) => {
    ContactModel.init({
        user_id: {
            type: Sequelize.DataTypes.BLOB,
            allowNull: false
        },
        id: {
            primaryKey: true,
            allowNull: false,
            type: Sequelize.DataTypes.STRING,
            defaultValue: () => Buffer.from(nacl.randomBytes(32)).toString('hex')
        },
        user_id_salt: {
            type: Sequelize.DataTypes.BLOB,
            allowNull: false
        },
        combined_id: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        secret_id: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        }
    }, {sequelize, modelName: 'contact', timestamps: false});

    return ContactModel;
}