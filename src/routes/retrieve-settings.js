//@ts-check

/**
 * Filename: retrieve-settings.js
 * Description: Returns the settings of the user
 */

const nacl              = require('tweetnacl'),
      path              = require('path'),
      rootPath          = require('app-root-path').path,
      config            = require(path.join(rootPath, 'src', 'config.js')),

      validateKeyString = require(path.join(rootPath, 'src', 'validators', 'key-string.js')),
      {QueryTypes}      = require('sequelize');

const MAX_PROOF_LENGTH = 10000;

module.exports = {
    path: 'get /api/retrieve_settings',
    handler: (dependencies) => async (req, res) => {
        const UserModel = dependencies.models.user;

        /** @type {string} */
        let publicSigningKey = req.query.publicSigningKey;

        /** @type {Buffer} */
        let publicSigningKeyBuffer;

        /** @type {string} */
        let proof            = req.query.proof;

        /** @type {Uint8Array} */
        let proofUint8;

        /** @type {Buffer} */
        let proofBuffer;

        /** @type {Uint8Array} */
        let openedProof;

        /** @type {string} */
        let openedProofString;

        /**
         *  Validate inputs
         *  ------------------------------------------------
         *  proof                         | base64 > text  | 
         *  publicSigningKey              | hex(32)        |
         **/
        if(!proof)            { res.status(400).json({message: `Missing 'proof' parameter.`, ok: false}); return; }
        if(!publicSigningKey) { res.status(400).json({message: `Missing 'publicSigningKey' parameter.`, ok: false}); return; }

        publicSigningKey = decodeURIComponent(publicSigningKey),
        proof            = decodeURIComponent(proof);

        if(proof.length > MAX_PROOF_LENGTH) {
            res.status(400).json({
                ok: false,
                message: `'proof' too long.`
            });
            return;
        }

        /** @type {{message: string, ok: boolean}} */
        const publicSigningKeyValidation = validateKeyString(publicSigningKey, nacl.sign.publicKeyLength);

        if(!publicSigningKeyValidation.ok) {
            res.status(400).json({message: `Invalid format for 'publicSigningKey'`, ok: false});
        }

        try {
            proofBuffer = Buffer.from(proof, 'base64');            
        } catch(e) {
            res.status(400).json({message: `Invalid format for 'proof'`, ok: false});
        }

        //Attempt to parse the public signing key
        try {
            publicSigningKeyBuffer = Buffer.from(req.query.publicSigningKey, 'hex');
        } catch(e) {
            res.status(400).json({message: `Invalid format for 'publicSigningKey'`, ok: false}); return;
        }

        //Retrieve the settings.
        const user = await UserModel.findOne({
            where: {
                public_signing_key: publicSigningKey
            }
        });

        if(!user) {
            res.status(400).json({ok: false, message: `Invalid public signing key.`}); return;
        }

        openedProof = nacl.sign.open(proofBuffer, publicSigningKeyBuffer);

        if(!openedProof) {
            res.status(400).json({ok: false, message: `Invalid proof (public key)`}); return;
        }

        openedProofString = new TextDecoder().decode(openedProof);

        const openedProofArgs = openedProofString.split(':');

        if(`${openedProofArgs[0]}:${openedProofArgs[1]}` !== 'msgApp:retrieveSettings') {
            res.status(400).json({ok: false, message: `Invalid proof (action)`}); return;
        }

        if((Date.now() - parseInt(openedProofArgs[2])) > config.maxProofTimeDelta) {
            res.status(400).json({ok: false, message: `Invalid proof (time)`}); return;
        }

        //Return null if the settings are null.
        if(user.settings === null) {
            res.json({
                ok: true,
                message: 'Success',
                data: {
                    settings: null,
                    settingsSymmetricEncryptionNonce: null
                }
            });
            return;
        }

        //Return the key.
        res.json({
            ok: true,
            message: 'Success',
            data: {
                settings: user.settings.toString('base64'),
                settingsSymmetricEncryptionNonce: user.settings_symmetric_encryption_nonce
            }
        })
    }
}