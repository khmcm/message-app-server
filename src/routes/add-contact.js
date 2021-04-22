//@ts-check

/** 
 * Description: Handles the addition of contacts to the database
 */

const nacl              = require('tweetnacl'),
      path              = require('path'),
      rootPath          = require('app-root-path').path,
      config            = require(path.join(rootPath, 'src', 'config.js')),

      validateKeyString = require(path.join(rootPath, 'src', 'validators', 'key-string.js')),
      {QueryTypes}      = require('sequelize');
      
      const MAX_USER_ID_BASE64_LENGTH = 10000;

module.exports = {
    path: 'post /api/add_contact',
    handler: (dependencies) => async (req, res) => {
        const ContactModel = dependencies.models.contact;
        const UserModel    = dependencies.models.user;

        /** @type {string} */
        let userId     = req.body.userId;

        /** @type {string} */
        let userIdSalt = req.body.userIdSalt;

        /** @type {string} */
        let combinedId = req.body.combinedId;

        /** @type {string} */
        let secretId   = req.body.secretId;

        /** @type {string} */
        let action     = req.body.action;

        if(!action) { res.status(400).json({message: `Missing 'action'`, ok: false}); return; }

        if(!['add', 'remove'].includes(action)) {
            res.status(400).json({message: `Invalid value for 'action'`, ok: false}); return;
        }

        /**
         * Validate inputs
         * ----------------------------
         * userId     | hex           | 
         * userIdSalt | hex           |
         * combinedId | hex           |
         * secretId   | hex           |
         * action     | text          |
         **/
        if(action === 'add') {
            if(!userId)     { res.status(400).json({message: `Missing 'userId'`, ok: false}); return; }
            if(!userIdSalt) { res.status(400).json({message: `Missing 'userIdSalt'`, ok: false}); return; }
            if(!secretId)   { res.status(400).json({message: `Missing 'secretId'`, ok: false}); return; }

            if(userId.length > MAX_USER_ID_BASE64_LENGTH) {
                res.status(400).json({message: `Invalid format for 'userId'`, ok: false}); return;
            }
        }
        if(!combinedId) { res.status(400).json({message: `Missing 'combinedId'`, ok: false}); return; }

        //Check that the secretId and userId are valid.

        /** @type {{message: string, ok: boolean}} */
        let combinedIdValidation;

        /**  @type {{message: string, ok: boolean}} */
        let secretIdValidation;

        /** @type {{message: string, ok: boolean}} */
        let userIdValidation;

        /** @type {{message: string, ok: boolean}} */
        let userIdSaltValidation;

        combinedIdValidation   = validateKeyString(combinedId, 32);

        secretIdValidation   = validateKeyString(secretId, 32);

        if(action === 'add') {
            userIdSaltValidation = validateKeyString(userIdSalt, 24);
            secretIdValidation   = validateKeyString(secretId, 32);

            if(!userIdSaltValidation.ok) { res.status(400).json({message: `Invalid format for 'userIdSalt'`, ok: false}); return; }
            if(!secretIdValidation.ok)   { res.status(400).json({message: `Invalid format for 'secretId'`, ok: false}); return; }

            try {
                //@ts-ignore
                userId = Buffer.from(userId, 'base64');
            } catch(e) {
                res.status(400).json({message: `Invalid 'userId'`, ok: false});
                return;
            }

            try {
                //@ts-ignore
                userIdSalt = Buffer.from(userIdSalt, 'hex');
            } catch(e) {
                res.status(400).json({message: `Invalid 'userIdSalt', ok: false`});
                return;
            }
        }

        //Check the validations and ensure they are correct.
        if(!combinedIdValidation.ok) { res.status(400).json(combinedIdValidation.message); return; }

        if(action === 'add') {
            ContactModel.findOrCreate({
                where: {
                    combined_id: combinedId,
                    secret_id: secretId,
                    user_id: userId,
                    user_id_salt: userIdSalt
                }
            });
        } else if(action === 'remove') {
            const contact = await (await ContactModel.findOne({
                where: {
                    combined_id: combinedId
                }
            }));

            if(contact) {
                contact.destroy();
            }
        }

        //Return a success message.
        res.json({
            ok: true,
            message: 'Success'
        })
    }
}