const config = require('config');

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host : config.get('db.host'),
    port : config.get('db.port'),
    user : config.get('db.user'),
    password : config.get('db.password'),
    database : config.get('db.database'),
  },
});

module.exports = knex;
