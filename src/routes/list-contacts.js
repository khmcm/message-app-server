//@ts-check

/**
 * Filename: list-contacts.js
 * Description: Lists the contacts of the user
 */

const nacl              = require('tweetnacl'),
      path              = require('path'),
      rootPath          = require('app-root-path').path,
      config            = require(path.join(rootPath, 'src', 'config.js')),

      validateKeyString = require(path.join(rootPath, 'src', 'validators', 'key-string.js')),
      {QueryTypes}      = require('sequelize');

const MAX_SECRET_ID = 10000;

module.exports = {
    path: 'get /api/list_contacts',
    handler: (dependencies) => async (req, res) => {
        const ContactModel = dependencies.models.contact,
              secretId     = req.query.secretId;

        /** 
         * Validate inputs
         * --------------------
         * secretId | hex(32) |
         **/
        if(!secretId) { res.status(400).json({message: `'secretId' missing`, ok: false}); return; }

        /** @type {{message: string, ok: false}} */
        const secretIdValidation = validateKeyString(secretId, 32);

        if(!secretIdValidation.ok) { res.status(400).json({message: `Invalid 'secretId'`, ok: false}); return; }

        //Retrieve all contacts.
        const contacts = await ContactModel.findAll({
            where: { 
                secret_id: secretId
            }
        })

        //Return a success message.
        res.json({
            ok: true,
            message: `Success`,
            data: Array.from(contacts)
                .map(contact => ({
                    userId: Buffer.from(contact.user_id).toString('base64'),
                    userIdSalt: Buffer.from(contact.user_id_salt).toString('hex')
                }))
        });
    }
}