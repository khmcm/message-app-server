const {Sequelize} = require('sequelize'),
      nacl      = require('tweetnacl');

class UserModel extends Sequelize.Model {};

module.exports = (sequelize) => {
    UserModel.init({
        display_name: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        signed_display_name: {
            type: Sequelize.DataTypes.BLOB,
            allowNull: true
        },
        id: {
            primaryKey: true,
            type: Sequelize.DataTypes.STRING,
            defaultValue: () => Buffer.from(nacl.randomBytes(32)).toString('hex'),
            allowNull: false
        },
        profile_picture_url: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true,
        },
        public_asymmetric_encryption_key: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        public_signing_key: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        status: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        signed_status: {
            type: Sequelize.DataTypes.BLOB,
            allowNull: true
        },
        settings_symmetric_encryption_nonce: {
            type: Sequelize.DataTypes.STRING,
            allowNull: true
        },
        settings: {
            type: Sequelize.DataTypes.BLOB,
            allowNull: true,
            defaultValue: () => new Uint8Array([])
        }
    }, {sequelize, modelName: 'user', timestamps: false});

    return UserModel;
}