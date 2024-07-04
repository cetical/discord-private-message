const {
  Client,
  GatewayIntentBits,
  Partials
} = require('discord.js');

const client = new Client({
  intents: [
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildBans,
      GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.Channel]
});

const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

let db;

function initDB() {
  return new Promise((resolve, reject) => {
    const dbPath = 'databases/database.db';
    const dirPath = 'databases/';

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        resolve(db);
      }
    });

    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY
      )`, (err) => {
          if (err) {
              console.error(err.message);
          }
      });
    });
  });
}

function manageID(id, action) {
  db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, row) => {
      if (err) {
          console.error(err.message);
          return;
      }

      if (action === 'add') {
          if (!row) {
              db.run(`INSERT INTO users (id) VALUES (?)`, [id], function(err) {
                  if (err) {
                      console.error(err.message);
                  }
              });
          } else {
              db.run(`DELETE FROM users WHERE id = ?`, [id], function(err) {
                  if (err) {
                      console.error(err.message);
                  }
              });
          }
      } else if (action === 'remove') {
          db.run(`DELETE FROM users WHERE id = ?`, [id], function(err) {
              if (err) {
                  console.error(err.message);
              }
          });
      }
  });
}

function checkIDExists(id, callback) {
  db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, row) => {
      if (err) {
          console.error(err.message);
          callback(false);
      } else if (row) {
          callback(true);
      } else {
          callback(false);
      }
  });
}

process.on('uncaughtException', (err) => {
  console.log('error:', err.message);
  console.log(err);
});

initDB().then(() => {
  client.on('ready', () => {
    console.log(`logged in as ${client.user.tag}`);
  });

  client.on('messageCreate', async (m) => {
    if (m.author.bot) return;
    if (m.guildId != null) return;

    authorId = String(m.author.id)

    const regex = /^pm (\d+) (.*)/;
    const match = m.content.match(regex);

    if (match) {
      (async () => {
          let exists = await new Promise(resolve => checkIDExists(authorId, resolve));
  
          if (!exists) {
              m.channel.send('you need to register first! type "toggle"');
              return;
          }
  
          const integerPartAsString = match[1];
  
          if (!isNaN(integerPartAsString)) {
              exists = await new Promise(resolve => checkIDExists(integerPartAsString, resolve));
              // exists = true // ONLY FOR TESTING - PLEASE DO NOT UNCOMMENT
              if (exists) {
                  let remainingText = match[2].trim();
  
                  try {
                      const user = await client.users.fetch(integerPartAsString, false);
                      user.send(`incoming message > "${remainingText}"`);
                      m.channel.send("message sent")
                  } catch (error) {
                      console.error(error);
                  }
              } else {
                  m.channel.send("user is not registered");
              }
          } else {
              console.log('invalid user id format');
          }
      })();
    }
  
    else if (m.content === "toggle") {
      checkIDExists(m.author.id, (exists) => {
          let action = exists ? 'remove' : 'add';
          manageID(m.author.id, action);
          m.channel.send(exists ? "you have been unregistered and can no longer be sent messages to!" : "you have now registered and can receive anonymous messages!"); // Send the appropriate message
      });
    } 
    else {
      m.channel.send("that's not a valid command! the commands you can use are `toggle` and `pm userid message`");
    }
  });

  client.login("TOKEN-HERE");
}).catch(console.error);
