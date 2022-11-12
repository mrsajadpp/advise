var MongoClient = require('mongodb').MongoClient;
let state = {
  db: null
}
function connect(done) {
  let url = 'mongodb://localhost:27017/'
  let dbname = 'advse';
  MongoClient.connect(url, (err, data) => {
    if (err) return done(err);
    state.db = data.db(dbname);
  });
  done();
}
function get() {
  return state.db;
}
module.exports = {
  connect,
  get
};