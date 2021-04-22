//@ts-check

/**
 * Filename: mute-user.js
 * Description: Mutes a user
 */

const nacl              = require('tweetnacl'),
      path              = require('path'),
      rootPath          = require('app-root-path').path,
      config            = require(path.join(rootPath, 'src', 'config.js')),

      validateKeyString = require(path.join(rootPath, 'src', 'validators', 'key-string.js')),
      {QueryTypes}      = require('sequelize');

const MAX_ACTION_LENGTH = 10000;

module.exports = {
    path: 'post /api/mute_user',
    handler: (dependencies) => async (req, res) => {
        const MutedUserModel = dependencies.models.muted_user;

        /** @type {string} */
        let combinedId = req.body.combinedId;

        /** @type {string} */
        let secretId   = req.body.secretId;

        /** @type {string} */
        let action     = req.body.action;

        /** 
         *  Validate inputs
         *  ----------------------------
         *  combinedId | hex           | 
         *  secretId   | hex           |
         *  action     | text          |
         **/
        if(!combinedId) { res.status(400).json({message: `Missing 'combinedId'`, ok: false}); return; }
        if(!secretId)   { res.status(400).json({message: `Missing 'secretId'`, ok: false}); return; }
        if(!action)     { res.status(400).json({message: `Missing 'message'`, ok: false}); return; }

        /** @type {{message: string, ok: boolean}} */
        const combinedIdValidation = validateKeyString(combinedId, 32);
        
        /** @type {{message: string, ok: boolean}} */
        const secretIdValidation = validateKeyString(secretId, 32);

        if(!combinedIdValidation.ok) { res.status(400).json({message: `Invalid 'combinedId'`, ok: false}); return; }
        if(!secretIdValidation.ok)   { res.status(400).json({message: `Invalid 'secretId'`, ok: false}); return; }

        if(action === 'mute') {
            await dependencies.sequelize.query(`INSERT INTO muted_users (combined_id, secret_id) VALUES(:combined_id, :secret_id) EXCEPT SELECT combined_id, secret_id FROM muted_users WHERE combined_id = :combined_id`, {
                replacements: {
                    combined_id: combinedId,
                    secret_id: secretId
                },
                type: QueryTypes.INSERT
            });
        } else if(action === 'unmute') {
            const mutedUser = await (await MutedUserModel
                .findOne({
                    where: {
                        combined_id: combinedId
                    }
                }));

            if(mutedUser) {
                mutedUser.destroy({
                    where: {
                        combined_id: combinedId
                    }
                });
            }
        }

        //Return a success message.
        res.json({
            ok: true,
            message: 'Success'
        })
    }
}