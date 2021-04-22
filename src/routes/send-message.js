//@ts-check

/**
 * Filename: send-message.js
 * Description: Handles the sending of a message
 */

const nacl              = require('tweetnacl');
const path              = require('path');
const rootPath          = require('app-root-path').path;
const config            = require(path.join(rootPath, 'src', 'config.js'));
const validateKeyString = require(path.join(rootPath, 'src', 'validators', 'key-string.js'));
const {QueryTypes}      = require('sequelize');

const MAX_MESSAGE_CONTENT_BASE64_LENGTH = 5000;

module.exports = {
    path: 'post /api/send_message',
    handler: (dependencies) => async (req, res) => {
        const MessageModel = dependencies.models.message;

        /** @type {'send'|'delete'|'edit'} */
        const action         = req.body.action;

        /** @type {string} */
        const content        = req.body.content;

        /** @type {string} */
        const conversationId = req.body.conversationId;

        /** @type {string} */
        const proof          = req.body.proof;

        /** @type {Buffer} */
        let proofBuffer;

        /** @type {string} */
        const messageEncryptionSalt = req.body.messageEncryptionSalt; 

        /** @type {Uint8Array} */
        let openedProofUint8;

        /** @type {string} */
        const combinedId     = req.body.combinedId;

        /** @type {string[]} */
        let openedProofArgs;

        /** @type {string} */
        let openedProofString;

        /** @type {string} */
        let publicSigningKey;

        /** @type {Buffer} */
        let publicSigningKeyBuffer;

        /** @type {string} */
        const messageId = req.body.messageId;

        /** @type {{message: string, ok: boolean}} */
        const conversationIdValidation = validateKeyString(conversationId, 32);

        /** @type {{message: string, ok: boolean}} */
        const combinedIdValidation = validateKeyString(combinedId, 32);

        /** @type {{message: string, ok: boolean}} */
        const messageIdValidation  = validateKeyString(messageId, 32);

        /** @type {{message: string, ok: boolean}} */
        const messageEncryptionSaltValidation = validateKeyString(messageEncryptionSalt, 24);

        /**
         * Validate inputs
         * --------------------------------
         * conversationId | hex(32)       |
         * content        | base64 > json |
         * proof          | base64 > text |
         * action         | text          |
         * messageId      | hex(32)       |
         **/
        if(!action)         { res.status(400).json({message: `Missing 'action'`, ok: false}); return; }

        if(content && content.length > MAX_MESSAGE_CONTENT_BASE64_LENGTH) {
            res.status(400).json({message: `'content' too long`, ok: false}); return;
        }

        //Check if the action is one of the two valid values
        if(!['send', 'delete', 'edit'].includes(action)) {
            res.status(400).json({message: `Invalid value for 'action'`, ok: false}); return;
        }

        if(!combinedIdValidation.ok)     { res.status(400).json({message: `Invalid 'combinedId'`, ok: false}); return; }

        switch(action) {
            case 'send': {
                
                if(!content)               { res.status(400).json({message: `Missing 'content' parameter`, ok: false}); return; }
                if(!conversationId)        { res.status(400).json({message: `Missing 'conversationId'`, ok: false}); return; }
                if(!messageEncryptionSalt) { res.status(400).json({message: `Missing 'messageEncryptionSalt'`, ok: false}); return; }
                //if(!proof)          { res.status(400).json({message: `Missing 'proof' parameter`, ok: false}); return; }

                if(!conversationIdValidation.ok)        { res.status(400).json({message: `Invalid 'conversationId'`, ok: false}); return; }
                if(!messageIdValidation.ok)             { res.status(400).json({message: `Invalid 'messageId'`, ok: false}); return; }
                if(!messageEncryptionSaltValidation.ok) { res.status(400).json({message: `Invalid 'messageEncryptionSalt'`, ok: false}); return; }

                if(await MessageModel.findOne({ where: { id: messageId } })) { res.status(400).json({message: `Message ID is already in use`, ok: false}); return; }

                let contentBuffer;

                try {
                    contentBuffer = Buffer.from(content, 'base64');
                } catch(e) {
                    res.status(400).json({message: `Invalid format for 'content'`, ok: false}); return;
                }

                await dependencies.sequelize.query(`INSERT INTO messages (id, conversation_id, combined_id, content, message_encryption_salt, sequence_number) VALUES (:id, :conversation_id, :combined_id, :content, :message_encryption_salt, (SELECT COALESCE(MAX(sequence_number) + 1, 1) FROM messages WHERE conversation_id = :conversation_id));`, {
                    replacements: {
                        id                     : messageId,
                        conversation_id        : conversationId,
                        combined_id            : combinedId,
                        content                : contentBuffer,
                        message_encryption_salt: messageEncryptionSalt
                    },
                    type: QueryTypes.INSERT
                });

                const message = await MessageModel.findOne({
                    where: {
                        id: messageId
                    }
                });

                dependencies.triggerMessageEvent({type: 'SEND_MESSAGE', payload: {content, messageEncryptionSalt, messageId, sequenceNumber: message.sequence_number}, conversationId});
            } break;

            case 'delete': {
                const message = await MessageModel.findOne({
                    where: {
                        combined_id: combinedId
                    }
                });

                if(message) {
                    await message.destroy();

                    dependencies.triggerMessageEvent({type: 'DELETE_MESSAGE', payload: {messageId: message.id}, conversationId: message.conversation_id});
                }
            } break;

            case 'edit': {
                if(!content)               { res.status(400).json({message: `Missing 'content' parameter`, ok: false}); return; }
                if(!messageEncryptionSalt) { res.status(400).json({message: `Missing 'messageEncryptionSalt'`, ok: false}); return; }

                let contentBuffer;

                try {
                    contentBuffer = Buffer.from(content, 'base64');
                } catch(e) {
                    res.status(400).json({message: `Invalid 'content'`, ok: false}); return;
                }

                const message = await MessageModel.findOne({
                    combined_id: combinedId
                });

                if(!message) {
                    res.status(400).json({message: `Message at with combined ID of 'combinedId' does not exist`, ok: false}); return;
                }

                await message.update({
                    message_encryption_salt: messageEncryptionSalt,
                    content: contentBuffer
                });

                dependencies.triggerMessageEvent({type: 'EDIT_MESSAGE', payload: {content, messageEncryptionSalt, messageId}, conversationId});
            } break;
        }

        //Return a success message.
        res.json({
            ok: true,
            message: 'Success'
        });
    }
        
}