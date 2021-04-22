//@ts-check

/**
 * Filename: message-stream.js
 * Description: Streams events to a client
 */

const nacl        = require('tweetnacl'),
path              = require('path'),
rootPath          = require('app-root-path').path,
config            = require(path.join(rootPath, 'src', 'config.js')),

validateKeyString = require(path.join(rootPath, 'src', 'validators', 'key-string.js')),
{QueryTypes}      = require('sequelize');

module.exports = {
    path: 'get /api/message_stream',
    handler: (dependencies) => (req, res) => {
        /** @type {string} */
        const conversationId = req.query.conversationId;
        
        /** @type {string} */
        const sessionId      = req.query.sessionId;

        /**
         * Validate inputs
         * ----------------------------
         * userId     | hex(32)       | 
         * userIdSalt | hex(24)       |
         * combinedId | hex(32)       |
         * secretId   | hex(32)       |
         * action     | text          |
         **/
        if(!conversationId) { res.status(400).json({message: `Invalid 'conversationId'`}); return; }
        if(!sessionId)      { res.status(400).json({message: `Invalid 'sessionId`}); return; }

        /** @type {{message: string, ok: boolean}} */
        const conversationIdValidation = validateKeyString(conversationId, 32);

        /** @type {{message: string, ok: boolean}} */
        const sessionIdValidation      = validateKeyString(sessionId, 32);
        
        if(!conversationIdValidation.ok) { res.status(400).json({message: `Invalid 'conversationId' format`, ok: false}); return; }
        if(!sessionIdValidation.ok)      { res.status(400).json({message: `Invalid 'sessionId' format`, ok: false}); return; }

        //Check if the sessionId is already taken
        if(dependencies.messageEventListeners.find((messageEventListener) => messageEventListener.sessionId === sessionId)) {
            res.json({message: `'sessionId' already in use`, ok: false}); return;
        }

        res.set({
            'Cache-Control': 'no-cache',
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive'
        });
        res.flushHeaders();

        res.write('retry: 10000\n\n');

        /** 
         * @param {Object} args
         * @param {string} args.type
         * @param {string} args.payload
         * @param {string} args.conversationId
         */
        function messageEventCallback({type, payload, conversationId}) {
            res.write(`data: ${JSON.stringify({type, payload, conversationId})}\n\n`);
        }

        dependencies.messageEventListeners.push({
            lastRaised: Date.now(),
            callback: messageEventCallback,
            conversationId: conversationId,
            sessionId: sessionId
        });
    }
}