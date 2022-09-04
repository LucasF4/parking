const knex = require('knex')({
    client: 'pg',
    connection: {
        host: 'ec2-44-206-89-185.compute-1.amazonaws.com',
        user: 'ijhzwbwquyqigq',
        password: '2baf6e277932d9c972cb824ff5f617814698cef94b8dec137ff0f7a52bcd7c8a',
        database: 'd391837ilhf7nv',
        timezone: '-03:00',
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    pool: {
        afterCreate: function(connection, callback) {
          connection.query('SET timeZone = "America/Sao_Paulo";', function(err) {
            callback(err, connection);
          });
        }
    }
    /* migrations: {
        directory: __dirname + "/db/migrations"
    },
    seeds: {
        directory: __dirname + "/db/seeds"
    } */
})

module.exports = knex