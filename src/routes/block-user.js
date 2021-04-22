//@ts-check

/**
 * Filename: block-user.js
 * Description: Handles the logic for blocking users
 */

const nacl              = require('tweetnacl'),
      path              = require('path'),
      rootPath          = require('app-root-path').path,
      config            = require(path.join(rootPath, 'src', 'config.js')),

      validateKeyString = require(path.join(rootPath, 'src', 'validators', 'key-string.js')),
      {QueryTypes}      = require('sequelize');

const MAX_PROOF_LENGTH = 10000;

module.exports = {
    path: 'post /api/block_user',
    handler: (dependencies) => async (req, res) => {
        const BlockedUserModel = dependencies.models.blocked_user;

        /** @type {string} */
        let combinedId       = req.body.combinedId;

        /** @type {string} */
        let secretId         = req.body.secretId;

        /** @type {string} */
        let action           = req.body.action;

        /**
         * Validate inputs
         * -----------------------
         * combinedId     | hex  | 
         * secretId       | hex  |
         * action         | text |
         **/
        //Validate that the provided parameters are valid
        if(!combinedId) { res.status(400).json({message: `Missing 'combinedId'`, ok: false}); return; }
        if(!secretId)   { res.status(400).json({message: `Missing 'secretId'`, ok: false}); return; }
        if(!action)     { res.status(400).json({message: `Missing 'action'`, ok: false}); return; }

        /** @type {{message: string, ok: boolean}} */
        const secretIdValidation = validateKeyString(secretId, nacl.sign.publicKeyLength);

        /** @type {{message: string, ok: boolean}} */
        const combinedIdValidation = validateKeyString(combinedId, 32);

        if(!secretIdValidation.ok) { res.status(400).json({message: `Invalid 'secretId'`, ok: false}); return; }
        if(!combinedIdValidation.ok) { res.status(400).json({message: `Invalid 'combinedId'`, ok: false}); return; }

        //Handle cases for blocking and unblocking
        if(action === 'block') {
            await dependencies.sequelize.query(`INSERT INTO blocked_users (combined_id, secret_id) VALUES(:combined_id, :secret_id) EXCEPT SELECT combined_id, secret_id FROM blocked_users WHERE combined_id = :combined_id`, {
                replacements: {
                    combined_id: combinedId,
                    secret_id: secretId
                },
                type: QueryTypes.INSERT
            });
        } else if(action === 'unblock') {
            const blockedUser = await (await BlockedUserModel.findOne({
                where: {
                    combined_id: combinedId
                }
            }));

            if(blockedUser) {
                blockedUser.destroy();
            }
        }

        //Return a success message.
        res.json({
            ok: true,
            message: 'Success'
        })
    }
}