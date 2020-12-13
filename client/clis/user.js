const vorpal = new (require('vorpal'))();

vorpal.find('exit').remove();
vorpal.use(require('../commands/logout'));
vorpal.find('logout').alias('exit');

module.exports = vorpal;