const {Sequelize} = require('sequelize'),
      nacl      = require('tweetnacl');

class MessageModel extends Sequelize.Model {};

module.exports = (sequelize) => {
    MessageModel.init({
        content: {
            type: Sequelize.DataTypes.BLOB,
            allowNull: false
        },
        id: {
            primaryKey: true,
            allowNull: false,
            type: Sequelize.DataTypes.STRING,
            defaultValue: () => Buffer.from(nacl.randomBytes(32)).toString('hex')
        },
        combined_id: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        conversation_id: {
            type: Sequelize.DataTypes.STRING,
            allowNull: false
        },
        message_encryption_salt: {
            allowNull: false,
            type: Sequelize.DataTypes.STRING
        },
        sequence_number: {
            allowNull: false,
            type: Sequelize.DataTypes.NUMBER
        }
    }, {sequelize, modelName: 'message', timestamps: false});

    return MessageModel;
}