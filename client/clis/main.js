const vorpal = new (require('vorpal'))();

vorpal.history('mini-mega-client-main');

vorpal.use(require('../commands/register'));
vorpal.use(require('../commands/login'));

vorpal.delimiter('guest@mini-mega$');

module.exports = vorpal;