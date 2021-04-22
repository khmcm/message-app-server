//@ts-check

/**
 * Filename: list-muted-users.js
 * Description: Returns a list of the muted users
 */

const nacl              = require('tweetnacl'),
      path              = require('path'),
      rootPath          = require('app-root-path').path,
      config            = require(path.join(rootPath, 'src', 'config.js')),

      validateKeyString = require(path.join(rootPath, 'src', 'validators', 'key-string.js')),
      {QueryTypes}      = require('sequelize');

const MAX_SECRET_ID = 10000;

module.exports = {
    path: 'get /api/list_muted_users',
    handler: (dependencies) => async (req, res) => {
        const MutedUserModel = dependencies.models.muted_user;

        /** @type {string} */
        const secretId       = req.query.secretId;

        /**
         * Validate inputs
         * ----------------------------
         * secretId   | hex(32)       |
         **/
        if(!secretId) { res.status(400).json({message: `'secretId' missing`, ok: false}); return; }

        /** @type {{message: string, ok: boolean}} */
        const secretIdValidation = validateKeyString(secretId, 32);

        if(!secretIdValidation.ok) { res.status(400).json({message: `Invalid format for 'secretId'`, ok: false}); return; }

        //Retrieve all blocked users.
        const mutedUsers = await MutedUserModel.findAll({
            where: {
                secret_id: secretId
            }
        })

        //Return a list of the muted users.
        res.json(
            Array.from(mutedUsers)
                .map(mutedUser => ({
                    combinedId: mutedUser.combined_id
                }))
        );
    }
}