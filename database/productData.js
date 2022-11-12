let db = require('./config.js')
let COLLECTIONS = require('./collections.js')
const ObjectId = require('mongodb').ObjectID;

module.exports = {
    addProduct: (product, callback) => {
        product.price = parseInt(product.price);
        product.oldPrice = parseInt(product.oldPrice);
        db.get().collection(COLLECTIONS.PRODUCTS).insertOne(product).then((data) => {
            callback(data.insertedId.toString());
        });
    },
    getAllProducts: (callback) => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(COLLECTIONS.PRODUCTS).find().toArray();
            resolve(products);
        });
    },
    getAllOrders: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(COLLECTIONS.ORDERS).find().toArray();
            resolve(products);
        });
    },
    getCartItems: (userId) => {
        return new Promise(async (resolve) => {
            let cart = await db.get().collection(COLLECTIONS.CART)
                .aggregate([{ $match: { user: ObjectId(userId) } },
                {
                    $project: { products: 1, _id: 0 }
                }]).toArray()
            let count = 0
            if (cart[0]) {
                count = cart[0].products.length
            }
            resolve(count)
        })
    },
    findProduct: (prodId) => {
        return new Promise(async (resolve, reject) => {
            let proObjId = ObjectId(prodId);
            let product = await db.get().collection(COLLECTIONS.PRODUCTS).findOne({ _id: proObjId });
            if (product) {
                resolve(product);
            } else {
                resolve(false);
            }
        });
    },
    delProd: (prodId) => {
        return new Promise(async (resolve) => {
            db.get().collection(COLLECTIONS.PRODUCTS).deleteOne({ _id: ObjectId(prodId) }, (err, data) => {
                if (!err) resolve(true)
            })
        })
    },
    upProd: (prodId) => {
        return new Promise(async (resolve, reject) => {
            let proObjId = ObjectId(prodId);
            let product = await db.get().collection(COLLECTIONS.PRODUCTS).updateOne({ _id: proObjId });
            if (product) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    },
    updateCart: (productId, userId) => {
        let proObject = {
            item: ObjectId(productId),
            quantity: 1
        }
        return new Promise(async (resolve) => {
            const userCart = await db.get().collection(COLLECTIONS.CART).findOne({ user: ObjectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == productId);
                if (proExist != -1) {
                    db.get().collection(COLLECTIONS.CART)
                        .updateOne({ user: ObjectId(userId), 'products.item': ObjectId(productId) }, {
                            $inc: { 'products.$.quantity': 1 }
                        }).then(() => {
                            resolve();
                        });
                } else {
                    db.get().collection(COLLECTIONS.CART)
                        .updateOne({ user: ObjectId(userId) }, {
                            $push: {
                                products: proObject
                            }
                        }).then((response) => {
                            resolve();
                        });
                }
            } else {
                const cart = {
                    user: ObjectId(userId),
                    products: [proObject]
                }
                db.get().collection(COLLECTIONS.CART).insertOne(cart, (err, done) => {
                    resolve()
                })
            }
        })
    },
    addFav: (productId, userId) => {
        let proObject = {
            item: ObjectId(productId),
            quantity: 1
        }
        return new Promise(async (resolve) => {
            const userCart = await db.get().collection(COLLECTIONS.FAV).findOne({ user: ObjectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == productId);
                if (proExist != -1) {
                    db.get().collection(COLLECTIONS.FAV)
                        .updateOne({ user: ObjectId(userId), 'products.item': ObjectId(productId) }, {
                            $inc: { 'products.$.quantity': 1 }
                        }).then(() => {
                            resolve();
                        });
                } else {
                    db.get().collection(COLLECTIONS.FAV)
                        .updateOne({ user: ObjectId(userId) }, {
                            $push: {
                                products: proObject
                            }
                        }).then((response) => {
                            resolve();
                        });
                }
            } else {
                const cart = {
                    user: ObjectId(userId),
                    products: [proObject]
                }
                db.get().collection(COLLECTIONS.FAV).insertOne(cart, (err, done) => {
                    resolve()
                })
            }
        })
    },
    getFav: (userId) => {
        return new Promise(async (resolve) => {
            let cart = await db.get().collection(COLLECTIONS.FAV)
                .aggregate([{
                    $match: { user: ObjectId(userId) }
                }, {
                    $unwind: '$products'
                }, {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                }, {
                    $lookup: {
                        from: COLLECTIONS.PRODUCTS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                }, {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: {
                            $arrayElemAt: ['$product', 0]
                        }
                    }
                }]).toArray()
            resolve(cart);
        })
    },
    succesOrder: (order) => {
        return new Promise((resolve) => {
            let orderData = {
                details: order.deliveryDetails,
                user_id: order.userId,
                payment: order.paymentMethod,
                amount: order.tottalAmount,
                products: order.products
            };
            db.get().collection(COLLECTIONS.PLACED).insertOne(orderData).then((response) => {
                db.get().collection(COLLECTIONS.ORDERS).deleteOne({ _id: ObjectId(order._id) }).then((response) => {
                    resolve(true)
                })
            })
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve) => {
            let cart = await db.get().collection(COLLECTIONS.CART)
                .aggregate([{
                    $match: { user: ObjectId(userId) }
                }, {
                    $unwind: '$products'
                }, {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                }, {
                    $lookup: {
                        from: COLLECTIONS.PRODUCTS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                }, {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: {
                            $arrayElemAt: ['$product', 0]
                        }
                    }
                }]).toArray()
            resolve(cart);
        })
    },
    removeCartItem: (cartId, prodId, userId) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(COLLECTIONS.CART).updateOne({ _id: ObjectId(cartId), user: ObjectId(userId) },
                {
                    $pull: { products: { item: ObjectId(prodId) } }
                }).then((response) => {
                    resolve({ removeProduct: true });
                });
        });
    },
    remFav: (userId, cartId, prodId) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(COLLECTIONS.FAV).updateOne({ _id: ObjectId(cartId), user: ObjectId(userId) },
                {
                    $pull: { products: { item: ObjectId(prodId) } }
                }).then((response) => {
                    resolve({ removeProduct: true });
                });
        });
    },
    editProd: (prodId, prodData) => {
        return new Promise((resolve, reject) => {
            let product = db.get().collection(COLLECTIONS.PRODUCTS).updateOne({ _id: ObjectId(prodId) }, {
                $set: {
                    title: prodData.title,
                    description: prodData.description,
                    category: prodData.category,
                    oldPrice: prodData.oldPrice,
                    price: prodData.price,
                    delivery: prodData.delivery
                }
            }).then((response) => {
                resolve(true);
            });
        });
    },
    changeQuantity: (details) => {
        return new Promise((resolve, reject) => {
            details.count = parseInt(details.count);
            details.quantity = parseInt(details.quantity);
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(COLLECTIONS.CART).updateOne({ _id: ObjectId(details.cart) },
                    {
                        $pull: { products: { item: ObjectId(details.product) } }
                    }).then((response) => {
                        resolve({ removeProduct: true });
                    });
            } else {
                db.get().collection(COLLECTIONS.CART).updateOne({ _id: ObjectId(details.cart), 'products.item': ObjectId(details.product) }, {
                    $inc: { 'products.$.quantity': details.count }
                }).then(() => {
                    resolve(true);
                });
            }
        });
    },
    tottalAmount: (userId) => {
        return new Promise(async (resolve) => {
            let total = await db.get().collection(COLLECTIONS.CART).aggregate([{
                $match: { user: ObjectId(userId) }
            }, {
                $unwind: '$products'
            }, {
                $project: {
                    item: '$products.item',
                    quantity: '$products.quantity'
                }
            }, {
                $lookup: {
                    from: COLLECTIONS.PRODUCTS,
                    localField: 'item',
                    foreignField: '_id',
                    as: 'product'
                }
            }, {
                $project: {
                    item: 1,
                    quantity: 1,
                    product: {
                        $arrayElemAt: ['$product', 0]
                    }
                }
            }, {
                $group: {
                    _id: null,
                    total: { $sum: { $multiply: ['$quantity', { $convert: { input: '$product.price', to: "int" } }] } }
                }
            }]).toArray()
            if (total.length) {
                resolve(total[0].total);
            } else {
                resolve(0);
            }
        })
    },
    deliveryCharge: (userId) => {
        return new Promise(async (resolve) => {
            let charge = await db.get().collection(COLLECTIONS.CART)
                .aggregate([{
                    $match: { user: ObjectId(userId) }
                }, {
                    $unwind: '$products'
                }, {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                }, {
                    $lookup: {
                        from: COLLECTIONS.PRODUCTS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                }, {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: {
                            $arrayElemAt: ['$product', 0]
                        }
                    }
                }, {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $convert: { input: '$product.charge', to: "int" } }] } }
                    }
                }]).toArray()
            if (charge.length) {
                resolve(charge[0].total);
            } else {
                resolve(0);
            }
        })
    },
    placeOrder: (order, product, total, user) => {
        return new Promise((resolve, reject) => {
            let orderObj = {
                deliveryDetails: {
                    name: order.firstname + ' ' + order.lastname,
                    mobile: order.phnumber,
                    email: user.email,
                    address: order.address,
                    pincode: order.pincode,
                    state: order.state,
                    country: 'INDIA',
                    city: order.city
                },
                userId: ObjectId(user._id),
                paymentMethod: 'online',
                products: product,
                tottalAmount: total,
                status: false,
                date: new Date()
            }
            db.get().collection(COLLECTIONS.ORDERS).insertOne(orderObj).then((response) => {
                db.get().collection(COLLECTIONS.CART).deleteOne({ user: ObjectId(user._id) });
                resolve(response)
            });
        });
    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(COLLECTIONS.CART).findOne({ user: ObjectId(userId) });
            resolve(cart);
        });
    },
    getOrders: (user) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(COLLECTIONS.ORDERS).find({ userId: ObjectId(user) }).toArray();
            if (orders) {
                resolve(orders);
            } else {
                resolve(false)
            }
        });
    },
    getUserOrders: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(COLLECTIONS.ORDERS).find({ _id: ObjectId(orderId) }).toArray();
            if (orders) {
                resolve(orders);
            } else {
                resolve(false)
            }
        });
    },
    cancelOrder: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(COLLECTIONS.ORDERS).deleteOne({ _id: ObjectId(orderId) }).then((response) => {
                resolve(true);
            })
        });
    },
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(COLLECTIONS.ORDERS).aggregate([{
                $match: {
                    _id: ObjectId(orderId)
                }
            }, {
                $unwind: '$products'
            }, {
                $project: {
                    item: '$products.item',
                    quantity: '$products.quantity'
                }
            }, {
                $lookup: {
                    from: COLLECTIONS.PRODUCTS,
                    localField: 'item',
                    foreignField: '_id',
                    as: 'product'
                }
            }, {
                $project: {
                    item: 1,
                    quantity: 1,
                    product: {
                        $arrayElemAt: ['$product', 0]
                    }
                }
            }]).toArray()
            resolve(orderItems);
        })
    },
    searchProduct: (query) => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(COLLECTIONS.PRODUCTS).find({ category: query }).toArray();
            if (products.length < 1) {
                products = await db.get().collection(COLLECTIONS.PRODUCTS).find({ title: query }).toArray();
                if (products.length < 1) {
                    products = await db.get().collection(COLLECTIONS.PRODUCTS).find({ price: query }).toArray();
                    if (products.length < 1) {
                        products = await db.get().collection(COLLECTIONS.PRODUCTS).find({ oldPrice: query }).toArray();
                        if (products.length < 1) {
                            products = await db.get().collection(COLLECTIONS.PRODUCTS).find({ description: query }).toArray();
                            if (products.length < 1) {
                                products = await db.get().collection(COLLECTIONS.PRODUCTS).find({ delivery: query }).toArray();
                            }
                        }
                    }
                }
            }
            resolve(products)
        });
    }
}