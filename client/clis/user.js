const vorpal = new (require('vorpal'))();

vorpal.history('mini-mega-client-user');

vorpal.use(require('../commands/logout'));
vorpal.use(require('../commands/system'));
vorpal.use(require('../commands/remote'));

module.exports = vorpal;
