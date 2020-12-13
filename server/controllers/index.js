const { Router } = require('express');

let router = Router();

router.use('/user', require('./user'));

module.exports = router;