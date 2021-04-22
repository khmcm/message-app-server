//@ts-check

/**
 * Filename: list-blocked-users.js
 * Description: Returns a list of the users that are blocked
 */
const nacl              = require('tweetnacl'),
      path              = require('path'),
      rootPath          = require('app-root-path').path,
      config            = require(path.join(rootPath, 'src', 'config.js')),

      validateKeyString = require(path.join(rootPath, 'src', 'validators', 'key-string.js')),
      {QueryTypes}      = require('sequelize');

const MAX_SECRET_ID = 10000;

module.exports = {
    path: 'get /api/list_blocked_users',
    handler: (dependencies) => async (req, res) => {
        const BlockedUserModel = dependencies.models.blocked_user;
        
        /** @type {string} */
        const secretId = req.query.secretId;

        /**
         * Validate inputs
         * ----------------
         * secretId | hex |
         **/
        if(!secretId) { res.status(400).json({message: `'secretId' missing`, ok: false}); return; }

        validateKeyString(secretId, 32);

        //Retrieve all blocked users.
        const blockedUsers = await BlockedUserModel.findAll({
            where: {
                secret_id: secretId
            }
        })

        //Return a success message.
        res.json(
            Array.from(blockedUsers)
                .map(blockedUser => ({
                    combinedId: blockedUser.combined_id
                }))
        );
    }
}