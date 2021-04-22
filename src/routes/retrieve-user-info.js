//@ts-check

/**
 * Filename: retrieve-user-info.js
 * Description: Returns information about a user
 */

const nacl              = require('tweetnacl'),
      path              = require('path'),
      rootPath          = require('app-root-path').path,
      config            = require(path.join(rootPath, 'src', 'config.js')),

      validateKeyString = require(path.join(rootPath, 'src', 'validators', 'key-string.js')),
      {QueryTypes}      = require('sequelize');

const MAX_PROOF_LENGTH = 10000;

module.exports = {
    path: 'get /api/user_info',
    handler: (dependencies) => async (req, res) => {
        const UserModel = dependencies.models.user;

        /** @type {any} */
        let user;

        /** @type {string} */
        let userId = req.query.userId;

        /** @type {boolean} */
        let isPublicSigningKey = null;

        /**
         *  Validate inputs
         *  -----------------------------------------
         *  publicAsymmetricEncryptionKey | hex(32) | 
         *  publicSigningKey              | hex(32) |
         **/
        if(!userId) { res.status(400).json({message: `Missing 'userId' parameter.`, ok: false}); return; }
    
        //Decode the user id from the URI format
        userId = decodeURIComponent(userId);

        /** @type {{message: string, ok: boolean}} */
        const keyStringValidation = validateKeyString(userId, nacl.sign.publicKeyLength);

        if(!keyStringValidation.ok) {
            isPublicSigningKey = false;
        } else {
            isPublicSigningKey = true;
        }

        if(isPublicSigningKey) {
            //Attempt to parse the user's signing key
            try {
                Buffer.from(userId, 'hex');
            } catch(e) {
                res.status(400).json({message: `Invalid format for 'userId'`, ok: false}); return;
            }

            //Retrieve the settings.
            user = await UserModel.findOne({
                where: {
                    public_signing_key: userId
                }
            });
        } else {
            //Attempt to locate the user by displayName.
            user = await UserModel.findOne({
                where: {
                    display_name: userId
                }
            })
        }

        if(!user) {
            res.status(400).json({ok: false, message: `Invalid user id.`}); return;
        }

        res.json({
            ok: true,
            message: 'Success',
            data: {
                publicSigningKey: user.public_signing_key,
                publicAsymmetricEncryptionKey: user.public_asymmetric_encryption_key,
                signedDisplayName: (user.signed_display_name === null)?null:Buffer.from(user.signed_display_name).toString('base64'),
                signedStatus: (user.signed_status === null)?null:Buffer.from(user.signed_status).toString('base64'),
                profilePictureUrl: user.profile_picture_url
            }
        });
    }
}