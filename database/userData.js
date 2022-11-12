let db = require('./config.js')
let COLLECTIONS = require('./collections.js')
const ObjectId = require('mongodb').ObjectID;
var bcrypt = require('bcrypt');
var crypto = require('crypto')
const Razorpay = require('razorpay')
const saltRounds = 10;
var instance = new Razorpay({
    key_id: 'rzp_test_2TOP2DA2HluKoO',
    key_secret: 'UCVabnF0GCgiXajvTAFextI9'
  });

module.exports = {
    findUser: async (userData) => {
        return new Promise(async (resolve, reject) => {
            let result = {}
            let validPassword
            const user = await db.get().collection(COLLECTIONS.USERS).findOne({ username: userData.username })
            if (!user) {
                result.loginStatus = false
            } else {
                validPassword = await bcrypt.compare(userData.password, user.password)
                if (!validPassword) {
                    result.loginStatus = false
                } else {
                    result.user = user
                    result.loginStatus = true
                }
            }
            if (result.loginStatus) {
                resolve(result)
            } else {
                reject(false)
            }
        });
    },
    createUser: async (userData) => {
        return new Promise(async (resolve, reject) => {
            let agread = await db.get().collection(COLLECTIONS.USERS).findOne({ username: userData.username });
            if (agread) {
                reject(agread)
            } else {
                userData.password = await bcrypt.hash(userData.password, saltRounds)
                await db.get().collection(COLLECTIONS.USERS).insertOne(userData).then((data, err) => {
                    if (!err) {
                        let user = db.get().collection(COLLECTIONS.USERS).findOne({ _id: data.insertedId })
                        if (user) {
                            resolve(user)
                        } else {
                            reject(false)
                        }
                    } else {
                        reject(err)
                        throw err
                    }
                })
            }
        })
    },
    doFind: (userId) => {
        return new Promise(async (resolve, reject) => {
            let response = {}
            let user = await db.get().collection(COLLECTIONS.USERS).findOne({ _id: userId });
            if (user) {
                response.status = true;
                response.user = user;
                resolve(response);
            } else {
                response.status = false;
                resolve(response);
            }
        });
    },
    generateRazorpay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: parseInt(total) * 100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: orderId
            };
            instance.orders.create(options, function (err, order) {
                if (err) {
                    console.log(err);
                } else {
                    resolve(order);
                }
            });
        });
    },
    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            let hmac = crypto.createHmac('sha256', 'rzp_test_2TOP2DA2HluKoO');
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]']);
            hmac = hmac.digest('hex');
            if (hmac == details['payment[razorpay_signature]']) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    },
    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(COLLECTIONS.ORDERS).updateOne({ _id: ObjectId(orderId) }, {
                $set: {
                    status: true
                }
            }).then(() => {
                resolve();
            });
        });
    }
}