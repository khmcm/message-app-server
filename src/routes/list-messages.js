//@ts-check

/**
 * Filename: list_messages.js
 * Description: Returns a list of the messages from a specified conversation
 */

 const nacl        = require('tweetnacl'),
 path              = require('path'),
 rootPath          = require('app-root-path').path,
 config            = require(path.join(rootPath, 'src', 'config.js')),

 validateKeyString = require(path.join(rootPath, 'src', 'validators', 'key-string.js')),
 {QueryTypes}      = require('sequelize');

const COUNT_LIMIT = 100;

module.exports = {
path: 'get /api/list_messages',
    handler: (dependencies) => async (req, res) => {
        const MessageModel = dependencies.models.message;

        /** @type {string} */
        const conversationId = req.query.conversationId;

        /** @type {number} */
        const before = parseInt(req.query.before);

        /** @type {number} */
        const count = parseInt(req.query.count);

        /** 
         *  Validate inputs
         *  ----------------------------
         *  conversationId | hex(32)    | 
         *  before         | number     |
         *  count          | number     |
         **/
        if(!conversationId)                   { res.status(400).json({message: `'conversationId' missing`, ok: false}); return; }
        if(typeof before === 'undefined')     { res.status(400).json({message: `'before' missing`, ok: false}); return; }
        if(typeof count === 'undefined')      { res.status(400).json({message: `'count' missing`, ok: false}); return; }

        if(isNaN(before))                     { res.status(400).json({message: `'before' is not a valid number`, ok: false}); return; }
        if(isNaN(count))                      { res.status(400).json({message: `'count' is not a valid number`, ok: false}); return; }

        if(count <= 0 || count > COUNT_LIMIT) { res.status(400).json({message: `'count' must be greater than 0 and less than ${COUNT_LIMIT}`, ok: false}); return; }
        if(before < 0)                        { res.status(400).json({message: `'before' must be greater than 0`, ok: false}); return; }

        /** @type {{message: string, ok: boolean}} */
        const conversationIdValidation = validateKeyString(conversationId, 32);

        if(!conversationIdValidation.ok) { res.status(400).json({message: `Invalid format for 'conversationId'`, ok: false}); return; }

        //Retrieve all blocked users.
        const messages = await dependencies.sequelize.query(`SELECT id, conversation_id, content, message_encryption_salt, sequence_number FROM messages WHERE conversation_id = :conversationId AND sequence_number < :before ORDER BY sequence_number ASC LIMIT :count`, {
            replacements: {
                before,
                count,
                conversationId
            },
            type: QueryTypes.SELECT
        });

        //Return a list of the muted users.
        res.json({
            message: `Success`,
            ok: true,
            data: Array.from(messages)
                .map(message => ({
                    content              : Buffer.from(message.content).toString('base64'),
                    messageEncryptionSalt: message.message_encryption_salt,
                    messageId            : message.id,
                    conversationId       : message.conversation_id,
                    sequenceNumber       : message.sequence_number
                }))
        });
    }
}