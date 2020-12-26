const vorpal = new (require('vorpal'))();

vorpal.history('mini-mega-client-user');

vorpal.use(require('../commands/logout'));
vorpal.use(require('../commands/system'));
vorpal.use(require('../commands/remote'));
vorpal.use(require('../commands/encrypt'));
vorpal.use(require('../commands/decrypt'));
vorpal.use(require('../commands/put'));
vorpal.use(require('../commands/get'));
vorpal.use(require('../commands/download'));

module.exports = vorpal;
