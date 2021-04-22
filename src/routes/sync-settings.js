//@ts-check

/**
 * Filename: sync-settings.js
 * Description: Synchronizes the settings to the server.
 */

const nacl              = require('tweetnacl'),
      path              = require('path'),
      rootPath          = require('app-root-path').path,
      config            = require(path.join(rootPath, 'src', 'config.js')),

      validateKeyString = require(path.join(rootPath, 'src', 'validators', 'key-string.js'));

const MAX_SETTINGS_BASE64_LENGTH = 10000;
const MAX_PROOF_LENGTH           = 10000;

module.exports = {
    path: 'post /api/sync_settings',
    handler: (dependencies) => async (req, res) => {

        const UserModel = dependencies.models.user;

        /** @type {string} */
        let publicSigningKey;

        /** @type {string} */
        let settings;

        /** @type {string} */
        let settingsSymmetricEncryptionNonce;

        /** @type {Buffer} */
        let settingsBuffer;

        /** @type {string} */
        let proof;

        /** @type {Buffer} */
        let proofBuffer;

        /** @type {Uint8Array} */
        let openedProofUint8;

        /** @type {string} */
        let openedProofString;

        /** @type {string[]} */
        let openedProofArgs;

                /**
         *  Validate inputs
         *  -----------------------------------------
         *  publicAsymmetricEncryptionKey | hex(32) | 
         *  publicSigningKey              | hex(32) |
         **/

        //The public signing key of the user
        if(!req.body.publicSigningKey)                 { res.status(400).json({ok: false, message: `Missing 'publicSigningKey'.`}); return; }

        //The symmetrically-encrypted base64 of the settings to sync
        if(!req.body.settings)                         { res.status(400).json({ok: false, message: `Missing 'settings'.`}); return; }

        //The nonce of the symmetrically-encrypted settings
        if(!req.body.settingsSymmetricEncryptionNonce) { res.status(400).json({ok: false, message: `Missing 'settingsSymmetricEncryptionNonce'.`}); return; }

        //A string with the action as well as time as a
        //salt, signed with the user's private signing key
        if(!req.body.proof)                            { res.status(400).json({ok: false, message: `Missing 'proof'`}); return; }

        //Limit settings base64 to 10,000 characters
        if(req.body.settings.length > MAX_SETTINGS_BASE64_LENGTH) {
            res.status(400).json({ok: false, message: `'settings' base64 too long.`});
            return;
        }

        //Limit proof base64 to 10,000 characters
        if(req.body.proof.length > MAX_PROOF_LENGTH) {
            res.status(400).json({ok: false, message: `'proof' base64 too long.`});
            return;
        }

        //Attempt to convert the proof base64 into a buffer
        try {
            proofBuffer = Buffer.from(req.body.proof, 'base64');
        } catch(e) {
            res.status(400).json({ok: false, message: `Invalid 'proof' format.`}); return;
        }

        //Validate the public key that was provided.
        validateKeyString(req.body.publicSigningKey, nacl.sign.publicKeyLength);

        //Validate the nonce for the symmetric encryption of the settings.
        validateKeyString(req.body.settingsSymmetricEncryptionNonce, nacl.secretbox.nonceLength);

        /* eslint-disable */
        publicSigningKey = req.body.publicSigningKey;
        settingsBuffer = Buffer.from(req.body.settings, 'base64');

        //Attempt to load
        const user = await UserModel.findOne({
            where: {
                public_signing_key: publicSigningKey
            }
        });

        //If the user is not found by their public signing
        //key
        if(!user) {
            res.status(400).json({
                ok: false,
                message: `Invalid public signing key.`
            });
            return;
        }

        openedProofUint8 = nacl.sign.open(proofBuffer, Buffer.from(publicSigningKey, 'hex'));

        if(!openedProofUint8) {
            res.status(400).json({ok: false, message: `Invalid proof (public key)`}); return;
        }

        openedProofString = new TextDecoder().decode(openedProofUint8);

        openedProofArgs = openedProofString.split(':');

    
        if(`${openedProofArgs[0]}:${openedProofArgs[1]}` !== 'msgApp:syncSettings') {
            res.status(400).json({ok: false, message: `Invalid proof (action)`}); return;
        }

        if((Date.now() - parseInt(openedProofArgs[2])) > config.maxProofTimeDelta) {
            res.status(400).json({ok: false, message: `Invalid proof (time)`}); return;
        }

        await user.update({
            settings: settingsBuffer,
            settings_symmetric_encryption_nonce: req.body.settingsSymmetricEncryptionNonce
        });

        res.json({ok: true, message: 'Success'});
        return;
    }
}