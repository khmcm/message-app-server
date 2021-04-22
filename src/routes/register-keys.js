//@ts-check

/**
 * Filename: register-keys.js
 * Description: Handles the creation of accounts and their
 *              key registration
 */

const nacl              = require('tweetnacl'),
      path              = require('path'),
      rootPath          = require('app-root-path').path,

      validateKeyString = require(path.join(rootPath, 'src', 'validators', 'key-string.js')),
      {QueryTypes}      = require('sequelize');

module.exports = {
    path: 'post /api/register_keys',
    handler: (dependencies) => async (req, res) => {
        const UserModel = dependencies.models.user;

        /** @type {Buffer} */
        let publicAsymmetricEncryptionKey;

        /** @type {Buffer} */
        let publicSigningKey;

        /**
         *  Validate inputs
         *  -----------------------------------------
         *  publicAsymmetricEncryptionKey | hex(32) | 
         *  publicSigningKey              | hex(32) |
         **/
        if(!req.body.publicAsymmetricEncryptionKey) { res.status(400).json({message: `Missing 'publicAsymmetricEncryptionKey' parameter.`, ok: false}); return; }
        if(!req.body.publicSigningKey)              { res.status(400).json({message: `Missing 'publicSigningKey' parameter.`, ok: false}); return; }
        
        //Validate the formatting of the keys.
        validateKeyString(req.body.publicAsymmetricEncryptionKey, nacl.box.publicKeyLength);
        validateKeyString(req.body.publicSigningKey, nacl.sign.publicKeyLength);
        
        //Attempt to parse the public key.
        try { 
            publicAsymmetricEncryptionKey = Buffer.from(req.body.publicAsymmetricEncryptionKey, 'hex'); 
        } catch(e) {
            res.status(400).json({message: `'publicKey' could not be parsed.`, ok: false});
        }

        //Attempt to parse the proof
        try {
            publicSigningKey = Buffer.from(req.body.publicSigningKey, 'hex');
        } catch(e) {
            res.status(400).json({message: `Invalid format for 'publicAsymmetricEncryptionKey'`, ok: false}); return;
        }

        const users = await dependencies.sequelize.query(`SELECT * FROM users WHERE public_asymmetric_encryption_key = :public_asymmetric_encryption_key OR public_signing_key = :public_signing_key`, {
            replacements: {
                public_asymmetric_encryption_key : publicAsymmetricEncryptionKey.toString('hex').toLowerCase(),
                public_signing_key               : publicSigningKey.toString('hex').toLowerCase()
            },
            type: QueryTypes.SELECT
        });

        if(users.length > 0) {
            res.status(400).json({
                ok : false,
                message : `One more more keys are already in use.`
            });
            return;
        }

        await (await UserModel.create({
            display_name                     : null,
            id                               : Buffer.from(nacl.randomBytes(32)).toString('hex').toLowerCase(),
            profile_picture_url              : null,
            public_asymmetric_encryption_key : publicAsymmetricEncryptionKey.toString('hex').toLowerCase(),
            public_signing_key               : publicSigningKey.toString('hex').toLowerCase(),
            status                           : null,
            settings                         : null,
            settingsSymmetricEncryptionNonce : null
        })).save();

        //Register the keypair
        res.json({
            message: 'Success',
            ok: true
        });
    }
}