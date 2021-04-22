//@ts-check

/**
 * Filename: update-display-name.js
 * Description: Updates the user's display name
 */

const nacl              = require('tweetnacl'),
      path              = require('path'),
      rootPath          = require('app-root-path').path,
      config            = require(path.join(rootPath, 'src', 'config.js')),

      validateKeyString = require(path.join(rootPath, 'src', 'validators', 'key-string.js')),
      {QueryTypes}      = require('sequelize');

const MAX_PROOF_LENGTH = 10000,
      MAX_DISPLAY_NAME_LENGTH = 100000,
      MAX_OPENED_DISPLAY_NAME_LENGTH = 

module.exports = {
    path: 'post /api/update_display_name',
    handler: (dependencies) => async (req, res) => {
        const UserModel = dependencies.models.user;

        /** @type {string} */
        let publicSigningKey  = req.body.publicSigningKey;

        /** @type {Buffer} */
        let publicSigningKeyBuffer;

        /** @type {string} */
        let proof             = req.body.proof;

        /** @type {Buffer} */
        let proofBuffer;

        /** @type {string} */
        let displayName       = req.body.displayName;

        /** @type {Buffer} */
        let displayNameBuffer;
        
        /** @type {Uint8Array} */
        let openedDisplayNameUint8;

        /** @type {string} */
        let openedDisplayNameString;

        /** @type {Uint8Array} */
        let openedProofUint8;

        /** @type {string} */
        let openedProofString;

        /**
         *  Validate inputs
         *  -----------------------------------------------
         *  proof                         | base64 > text |
         *  displayName                   | text          |
         *  publicSigningKey              | hex(32)       |
         **/
        if(!proof)             { res.status(400).json({message: `Missing 'proof' parameter.`, ok: false}); return; }
        if(!publicSigningKey)  { res.status(400).json({message: `Missing 'publicSigningKey' parameter.`, ok: false}); return; }
        if(!displayName)       { res.status(400).json({message: `Missing 'displayName'`, ok: false}); return; }

        if(proof.length > MAX_PROOF_LENGTH) {
            res.status(400).json({
                ok: false,
                message: `'proof' too long.`
            });
            return;
        }

        validateKeyString(publicSigningKey, nacl.sign.publicKeyLength);

        try { proofBuffer = Buffer.from(proof, 'base64'); } catch(e) { res.status(400).json({message: `Invalid format for 'proof'`, ok: false}); return; }

        //Attempt to parse the proof
        try { publicSigningKeyBuffer = Buffer.from(publicSigningKey, 'hex'); } catch(e) { res.status(400).json({message: `Invalid format for 'publicSigningKey'`, ok: false}); return; }

        //Attempt to parse the signed displayName
        try { displayNameBuffer = Buffer.from(displayName, 'base64'); } catch(e) { res.status(400).json({message: `Invalid format for 'displayName'`, ok: false}); return; }

        if(displayName.length > MAX_DISPLAY_NAME_LENGTH) { res.status(400).json({message: `Display name too long.`, ok: false}); return; }

        //Retrieve the settings.
        const user = await UserModel.findOne({
            where: {
                public_signing_key: publicSigningKey
            }
        });

        if(!user) {
            res.status(400).json({message: `Invalid public signing key.`, ok: false}); return;
        }

        openedDisplayNameUint8 = nacl.sign.open(displayNameBuffer, publicSigningKeyBuffer);

        if(!openedDisplayNameUint8) {
            res.status(400).json({message: `Invalid display name signing`, ok: false}); return;
        }

        openedDisplayNameString = new TextDecoder().decode(openedDisplayNameUint8);

        if(openedDisplayNameString.length > config.maxDisplayNameLength) {
            res.status(400).json({
                message: `Display name too long (>${config.maxDisplayNameLength} characters)`,
                ok: false
            });
            return;
        }
        if(openedDisplayNameString.length < config.minDisplayNameLength) {
            res.status(400).json({
                message: `Display name too short (<${config.minDisplayNameLength} characters)`,
                ok: false
            });
            return;
        }

        openedProofUint8 = nacl.sign.open(proofBuffer, publicSigningKeyBuffer);

        if(!openedProofUint8) {
            res.status(400).json({
                message: `Invalid proof (public key)`,
                ok: false
            });
            return;
        }

        openedProofString = new TextDecoder().decode(openedProofUint8);

        const openedProofArgs = openedProofString.split(':');
        if(`${openedProofArgs[0]}:${openedProofArgs[1]}` !== 'msgApp:updateDisplayName') {
            res.status(400).json({
                message: `Invalid proof (action)`,
                ok: false
            });
            return;
        }

        if((Date.now() - parseInt(openedProofArgs[2])) > config.maxProofTimeDelta) {
            res.status(400).json({ok: false, message: `Invalid proof (time)`}); return;
        }

        await user.update({
            display_name: openedDisplayNameString,
            signed_display_name: displayNameBuffer,
        });

        //Return a success message.
        res.json({
            ok: true,
            message: 'Success'
        })
    }
}