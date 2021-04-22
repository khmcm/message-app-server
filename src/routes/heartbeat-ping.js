//@ts-check

/**
 * Filename: heartbeat-ping.js
 * Description: Handles the logic for user pings in order to prevent active sessions
 *              from being removed for idleness.
 */

 const nacl        = require('tweetnacl'),
 path              = require('path'),
 rootPath          = require('app-root-path').path,
 config            = require(path.join(rootPath, 'src', 'config.js')),

 validateKeyString = require(path.join(rootPath, 'src', 'validators', 'key-string.js')),
 {QueryTypes}      = require('sequelize');

const MAX_PROOF_LENGTH = 10000;

module.exports = {
path: 'post /api/heartbeat_ping',
handler: (dependencies) => async (req, res) => {
    const conversationId = req.body.conversationId,
          sessionId      = req.body.sessionId;

    /** @type {{message: string, ok: boolean}} */
    let conversationIdValidation;

    /** @type {{message: string, ok: boolean}} */
    let sessionIdValidation;

        /**
         * Validate inputs
         * ----------------------------
         * conversationId | hex(32)   | 
         * sessionId      | hex(32)   |
         * conversationId | hex(32)   |
         **/
    if(!conversationId) { res.status(400).json({message: `Missing 'conversationId'`, ok: false}); return; }
    if(!sessionId)      { res.status(400).json({message: `Missing 'sessionId'`, ok: false}); return; }

    conversationIdValidation = validateKeyString(conversationId, 32),
    sessionIdValidation      = validateKeyString(sessionId, 32);

    if(!conversationIdValidation.ok) {
        res.status(400).json({message: `Invalid format for 'conversationId'`, ok: false}); return;
    }
    if(!sessionIdValidation.ok) {
        res.status(400).json({message: `Invalid format for 'sessionId'`, ok: false}); return;
    }

    const messageEventListener = dependencies.messageEventListeners.find((messageEventListener) => messageEventListener.sessionId === sessionId);
    if(messageEventListener) {
        messageEventListener.lastRaised = Date.now();
    }

   //Return a success message.
   res.json({
       ok: true,
       message: 'Success'
   })
}
}