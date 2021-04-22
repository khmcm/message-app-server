//@ts-check

/**
 * Filename: update-status.js
 * Description: Updates the user's status
 */

const nacl              = require('tweetnacl'),
      path              = require('path'),
      rootPath          = require('app-root-path').path,
      config            = require(path.join(rootPath, 'src', 'config.js')),

      validateKeyString = require(path.join(rootPath, 'src', 'validators', 'key-string.js')),
      {QueryTypes}      = require('sequelize');

const MAX_PROOF_LENGTH  = 10000,
      MAX_STATUS_LENGTH = 10000;

module.exports = {
    path: 'post /api/update_status',
    handler: (dependencies) => async (req, res) => {
        const UserModel = dependencies.models.user;

        /** @type {string} */
        let publicSigningKey = req.body.publicSigningKey;

        /** @type {Buffer} */
        let publicSigningKeyBuffer;

        /** @type {string} */
        let proof            = req.body.proof;

        /** @type {Buffer} */
        let proofBuffer;
        
        /** @type {string} */
        let status           = req.body.status;

        /** @type {Buffer} */
        let statusBuffer;

        /** @type {Uint8Array} */
        let openedStatusUint8;

        /** @type {string} */
        let openedStatusString;

        /** @type {Uint8Array} */
        let openedProofUint8;

        /** @type {string}  */
        let openedProofString;

        /**
         *  Validate inputs
         *  -----------------------------------------------
         *  proof                         | base64 > text | 
         *  status                        | hex(32)       | 
         *  publicSigningKey              | hex(32)       |
         **/
        if(!proof)            { res.status(400).json({message: `Missing 'proof' parameter.`, ok: false}); return; }
        if(!publicSigningKey) { res.status(400).json({message: `Missing 'publicSigningKey' parameter.`, ok: false}); return; }
        if(!status)           { res.status(400).json({message: `Missing 'status'`, ok: false}); return; }

        publicSigningKey = publicSigningKey,
        proof            = proof,
        status           = status;

        if(proof.length > MAX_PROOF_LENGTH) {
            res.status(400).json({
                ok: false,
                message: `'proof' too long.`
            });
            return;
        }

        validateKeyString(publicSigningKey, nacl.sign.publicKeyLength);

        try {
            proofBuffer = Buffer.from(proof, 'base64');            
        } catch(e) {
            res.status(400).json({
                ok: false,
                message: `Invalid format for 'proof'`
            });
            return;
        }

        //Attempt to parse the proof
        try {
            publicSigningKeyBuffer = Buffer.from(publicSigningKey, 'hex');
        } catch(e) {
            res.status(400).json({
                ok: false,
                message: `Invalid format for 'publicSigningKey'`
            });
            return;
        }

        try {
            statusBuffer = Buffer.from(status, 'base64');
        } catch(e) {
            res.status(400).json({
                ok: false,
                message: `Invalid format for 'status'`
            });
            return;
        }

        //Retrieve the settings.
        const user = await UserModel.findOne({
            where: {
                public_signing_key: publicSigningKeyBuffer.toString('hex')
            }
        });

        if(!user) {
            res.status(400).json({message: `Invalid public signing key (lookup)`, ok: false}); return;
        }

        openedStatusUint8 = nacl.sign.open(statusBuffer, publicSigningKeyBuffer);
        if(!openedStatusUint8) {
            res.status(400).json({ok: false, message: 'Invalid status (public signing key)'}); return;
        }

        openedStatusString = new TextDecoder().decode(openedStatusUint8);

        if(openedStatusString.length > config.maxStatusLength) {
            res.status(400).json({
                ok: false,
                message: `Status too long (>${config.maxStatusLength})`
            });
            return;
        }

        openedProofUint8 = nacl.sign.open(proofBuffer, publicSigningKeyBuffer);

        if(!openedProofUint8) {
            res.status(400).json({ok: false, message: `Invalid proof (public key)`}); return;
        }

        openedProofString = new TextDecoder().decode(openedProofUint8);

        const openedProofArgs = openedProofString.split(':');
        if(`${openedProofArgs[0]}:${openedProofArgs[1]}` !== 'msgApp:updateStatus') {
            res.status(400).json({
                ok: false,
                message: `Invalid proof (action)`
            });
            return;
        }

        if((Date.now() - parseInt(openedProofArgs[2])) > config.maxProofTimeDelta) {
            res.status(400).json({
                ok: false,
                message: `Invalid proof (time)`
            });
            return;
        }

        await user.update({
            status: (openedStatusString === '')?null:openedStatusString,
            signed_status: Buffer.from(status, 'base64')
        });

        //Return a success message.
        res.json({
            ok: true,
            message: 'Success'
        });
        return;
    }
}