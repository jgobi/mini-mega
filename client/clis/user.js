const vorpal = new (require('vorpal'))();

vorpal.history('mini-mega-client-user');

vorpal.use(require('../commands/logout'));

module.exports = vorpal;
