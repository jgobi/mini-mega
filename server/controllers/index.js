const { Router } = require('express');

let router = Router();

router.use('/user', require('./user'));
router.use('/file', require('./file'));

module.exports = router;