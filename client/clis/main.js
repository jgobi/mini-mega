const vorpal = new (require('vorpal'))();

vorpal.history('mini-mega-client-main');

vorpal.use(require('../commands/register'));
vorpal.use(require('../commands/login'));
vorpal.use(require('../commands/system'));
vorpal.use(require('../commands/download'));

module.exports = vorpal;