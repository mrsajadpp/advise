var express = require('express');
var router = express.Router();

//Database
var userData = require('../database/userData.js');
var productData = require('../database/productData.js');
let generateOTP = require('../modules/otp.js')
let sendMail = require('../modules/mailer')
const { response } = require('express');
let user = false;
//VERIFY LOGIN
function verifyLogin(req, res, next) {
  if (req.session.login) {
    user = req.session.user;
    user.admin = Boolean(user.admin);
    next();
  } else {
    user = false;
    res.redirect('/login');
  }
}
function verifyAdmin(req, res, next) {
  if (req.session.user.admin) {
    next();
  } else {
    res.redirect('/login');
  }
}
//PRODUCTS
router.get('/', async (req, res, next) => {
  productData.getAllProducts().then((products) => {
    for (let i = 0; i < products.length; i++) {
      products[i].title = products[i].title.slice(0, 10) + '...';
      products[i].description = products[i].description.slice(0, 20) + '...';
    }
    if (req.session.login) {
      productData.getCartItems(req.session.user._id).then((notcount) => {
        res.render('user/products', { title: 'Products', description: 'Tasty fresh honey', products, style: 'products', notcount, user: req.session.user, script: 'products', login: req.session.login });
      })
    } else {
      res.render('user/products', { title: 'Products', description: 'Tasty fresh honey', products, style: 'products', user: req.session.user, script: 'products', login: req.session.login });
    }
  }).catch((err) => {
    res.render('user/products', { title: 'Products', description: 'Tasty fresh honey', style: 'products', user: req.session.user, script: 'products', login: req.session.login });
  });
});
//ACCOUND
router.get('/account', verifyLogin, async function (req, res, next) {
  productData.getCartItems(req.session.user._id).then((notcount) => {
    res.render('user/account', { title: 'Accound', description: 'Your account', notcount, user: req.session.user, style: 'account', script: 'account', login: req.session.login });
  });
});
//PRODUCT FAVOURITE
router.get('/favourites', verifyLogin, async (req, res, next) => {
  productData.getFav(req.session.user._id).then((favourites) => {
    productData.getCartItems(req.session.user._id).then((notcount) => {
      for (let index = 0; index < favourites.length; index++) {
        favourites[index].product.title = favourites[index].product.title.slice(0, 10) + '...';
        favourites[index].product.description = favourites[index].product.description.slice(0, 20) + '...';
      }
      res.render('user/favourites', { title: 'Favourites', description: 'Your favourite products', favourites, notcount, user: req.session.user, style: 'favourite', script: 'favourites', login: req.session.login });
    });
  })
})
router.get('/favourite/:podId', verifyLogin, async (req, res, next) => {
  if (req.params.podId) {
    productData.addFav(req.params.podId, req.session.user._id).then(() => {
      res.redirect('/favourites')
    })
  }
})
router.get('/remfav/:favId/:itemId', verifyLogin, async (req, res, next) => {
  if (req.params.favId) {
    productData.remFav(req.session.user._id, req.params.favId, req.params.itemId).then(() => {
      res.redirect('/')
    })
  }
})
//SHOPPING CART
router.get('/cart', verifyLogin, async (req, res, next) => {
  productData.getCartItems(req.session.user._id).then((notcount) => {
    productData.getCartProducts(req.session.user._id).then((items) => {
      productData.tottalAmount(req.session.user._id).then((amount) => {
        productData.deliveryCharge(req.session.user._id).then((charge) => {
          console.log(items) 
          for (let index = 0; index < items.length; index++) {
            items[index].product.title = items[index].product.title.slice(0, 10) + '...';
            items[index].product.description = items[index].product.description.slice(0, 20) + '...';
            items[index].product.charge = items[index].product.charge * items[index].quantity;
            items[index].product.price = items[index].product.price * items[index].quantity;
          }
          res.render('user/cart', { title: 'Shopping Cart', description: 'Shopping Cart', products: items, amount, charge, notcount, user: req.session.user, login: req.session.login, style: 'cart', script: 'cart' })
        })
      })
    }).catch((err) => {
      res.render('user/cart', { title: 'Shopping Cart', description: 'Shopping Cart', notcount, user: req.session.user, login: req.session.login, style: 'cart', script: 'cart' })
    })
  });
});
router.get('/addcart/:prodId', verifyLogin, async (req, res, next) => {
  if (req.params.prodId) {
    productData.updateCart(req.params.prodId, req.session.user._id).then((response) => {
      res.redirect('/cart');
    });
  }
});
//CHANGE QUANTITY
router.post('/quantity', verifyLogin, async (req, res, next) => {
  productData.changeQuantity(req.body).then(async (response) => {
    response.total = await productData.tottalAmount(req.session.user._id);
    res.json(response);
  });
})
//ORDER
router.get('/order', verifyLogin, async (req, res, next) => {
  productData.getCartItems(req.session.user._id).then((notcount) => {
    productData.getCartProducts(req.session.user._id).then((items) => {
      productData.tottalAmount(req.session.user._id).then((amount) => {
        productData.deliveryCharge(req.session.user._id).then((charge) => {
          for (let index = 0; index < items.length; index++) {
            items[index].product.charge = items[index].product.charge * items[index].quantity;
            items[index].product.price = items[index].product.price * items[index].quantity;
          }
          res.render('user/address', { title: 'Place Oder', description: 'Place your order', products: items, amount, charge, tottal: amount + charge, notcount, user: req.session.user, login: req.session.login, style: 'address', script: 'address' })
        })
      })
    }).catch((err) => {
      res.render('user/address', { title: 'Place Order', description: 'Place your order', notcount, user: req.session.user, login: req.session.login, style: 'address', script: 'address' })
    })
  });
})
//PLACE ORDER
router.post('/placeorder', verifyLogin, async (req, res, next) => {
  productData.getCartProducts(req.session.user._id).then((products) => {
    productData.tottalAmount(req.session.user._id).then((tottalAmount) => {
      productData.deliveryCharge(req.session.user._id).then((charge) => {
        productData.placeOrder(req.body, products, tottalAmount + charge, req.session.user).then((response) => {
          userData.generateRazorpay(response.insertedId.toString(), tottalAmount + charge, req.session.user._id).then((response) => {
            res.json({ response, data: req.body });
          })
        })
      })
    })
  })
})
//VERIFY PAYMENT
router.post('/verifypayment', verifyLogin, (req, res, next) => {
  userData.verifyPayment(req.body).then((response) => {
    userData.changePaymentStatus(req.body['order[receipt]']).then(() => {
      res.json(response);
    });
  });
});
//ORDERS
router.get('/orders', verifyLogin, async (req, res, next) => {
  productData.getCartItems(req.session.user._id).then((notcount) => {
    productData.getOrders(req.session.user._id).then((orders) => {
      res.render('user/orders', { title: 'Orders', description: 'All your orders here', user: req.session.user, notcount, orders, style: 'orders', script: 'orders', login: req.session.login })
    })
  })
})
//PAYMENT RESSULT
router.get('/status/:status', verifyLogin, (req, res, next) => {
  if (req.params.status) {
    res.render('user/succes', { title: 'Pyment Success', user: req.session.user, style: 'status', hideHead: true })
  } else {
    res.render('user/faile', { title: 'Pyment Faied', user: req.session.user, style: 'status', hideHead: true })
  }
})
//VIEW ORDERS
router.get('/orderproducts/:orderId', verifyLogin, (req, res, next) => {
  if (req.params.orderId) {
    productData.getOrderProducts(req.params.orderId).then((orders) => {
      productData.getCartItems(req.session.user._id).then((notcount) => {
        for (let index = 0; index < orders.length; index++) {
          orders[index].product.title = orders[index].product.title.slice(0, 10) + '...';
          orders[index].product.description = orders[index].product.description.slice(0, 20) + '...';
        }
        res.render('user/order', { title: 'Orders', description: 'All your orders here', hideHead: true, user: req.session.user, notcount, orders, style: 'order', script: 'order', login: req.session.login })
      })
    })
  }
})
//CANCEL ORDER
router.get('/ordercancel/:orderId', verifyLogin, async (req, res, next) => {
  if (req.params.orderId) {
    productData.getUserOrders(req.params.orderId).then(async (response) => {
      userData.doFind(response[0].userId).then(async (userData) => {
        let otp = await generateOTP();
        let message = {
          email: req.session.user.email,
          title: 'Your one time password',
          text: 'Your one time password is ' + otp + '.',
          content: `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
          <div style="margin:50px auto;width:70%;padding:20px 0">
            <div style="border-bottom:1px solid #eee">
              <a href="" style="font-size:1.4em;color: #ec3531;text-decoration:none;font-weight:600">Trace inc</a>
            </div>
            <p style="font-size:1.1em">Hi,</p>
            <p>Thank you for choosing Trace inc. Use the following OTP to complete your Order cancellation. OTP is valid for before refresh the page</p>
            <h2 style="background: #ec3531;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 1px;">${otp}</h2>
            <p style="font-size:0.9em;">Regards,<br />Trace inc</p>
            <hr style="border:none;border-top:1px solid #eee" />
            <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
              <p>Trace inc</p>
              <p>Kolathur po 679338, Kerala 679338</p>
              <p>India</p>
            </div>
          </div>
        </div>`
        }
        await sendMail(message)
        res.render('user/accept', { title: 'Cancel your order', onetp: otp, description: 'Cancel your order', hideHead: true, order: req.params.orderId, style: 'otp' })
      })
    })
  }
})
router.post('/cancel', verifyLogin, (req, res, next) => {
  if (req.body.onetp == req.body.otp) {
    productData.cancelOrder(req.body.orderId).then((response) => {
      res.redirect('/orders')
    })
  } else {
    res.redirect('/orders')
  }
})
router.get('/user/order/cancel/:orderId', verifyLogin, verifyAdmin, async (req, res, next) => {
  if (req.params.orderId) {
    productData.getUserOrders(req.params.orderId).then(async (response) => {
      userData.doFind(response[0].userId).then(async (userData) => {
        let otp = await generateOTP();
        let message = {
          email: userData.user.email,
          title: 'Your one time password',
          text: 'Your one time password is ' + otp + '.',
          content: `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
          <div style="margin:50px auto;width:70%;padding:20px 0">
            <div style="border-bottom:1px solid #eee">
              <a href="" style="font-size:1.4em;color: #ec3531;text-decoration:none;font-weight:600">Trace inc</a>
            </div>
            <p style="font-size:1.1em">Hi,</p>
            <p>Thank you for choosing Trace inc. Use the following OTP to complete your Order cancellation. OTP is valid for before refresh the page</p>
            <h2 style="background: #ec3531;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 1px;">${otp}</h2>
            <p style="font-size:0.9em;">Regards,<br />Trace inc</p>
            <hr style="border:none;border-top:1px solid #eee" />
            <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
              <p>Trace inc</p>
              <p>Kolathur po 679338, Kerala 679338</p>
              <p>India</p>
            </div>
          </div>
        </div>`
        }
        await sendMail(message)
        res.render('user/accept', { title: 'Cancel your order', onetp: otp, description: 'Cancel your order', hideHead: true, order: req.params.orderId, style: 'otp' })
      })
    })
  }
})
router.post('/user/cancel', verifyLogin, verifyAdmin, (req, res, next) => {
  if (req.body.onetp == req.body.otp) {
    productData.getUserOrders(req.body.orderId).then(async (orderData) => {
      userData.doFind(orderData[0].userId).then(async (userData) => {
        let order = {};
        for (let i = 0; i < orderData.length; i++) {
          if (orderData[i]._id == req.body.orderId) {
            order = orderData[i]
          }
        }
        productData.cancelOrder(req.body.orderId).then(async (response) => {
          let username = userData.user.username.charAt(0).toUpperCase() + userData.user.username.slice(1);
          let message = {
            email: userData.user.email,
            title: 'Your order was cancelled',
            text: 'Dear ' + username + '.',
            content: `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
           <div style="margin:50px auto;width:70%;padding:20px 0">
               <div style="border-bottom:1px solid #eee">
                   <a href="" style="font-size:1.4em;color: #ec3531;text-decoration:none;font-weight:600">Trace inc</a>
               </div>
               <p style="font-size:1.1em">Hi,</p>
               <p>Thank you for choosing Trace inc. Dear ${username}. Your order was succesfully cancelled</p>
               <p>Order id: <span style="color:#ec3531">${order._id}</span></p>
               <p style="font-size:0.9em;">Regards,<br />Trace inc</p>
               <hr style="border:none;border-top:1px solid #eee" />
               <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
                   <p>Trace inc</p>
                   <p>Kolathur po 679338, Kerala 679338</p>
                   <p>India</p>
               </div>
           </div>
       </div>`
          }
          await sendMail(message)
          res.redirect('/user/orders')
        })
      })
    })
  } else {
    res.redirect('/user/orders')
  }
})
//ACCEPT 
router.get('/accept/:orderId', verifyLogin, verifyAdmin, async (req, res, next) => {
  if (req.params.orderId) {
    productData.getUserOrders(req.params.orderId).then(async (response) => {
      userData.doFind(response[0].userId).then(async (userData) => {
        let otp = await generateOTP();
        let message = {
          email: userData.user.email,
          title: 'Your one time password',
          text: 'Your one time password is ' + otp + '.',
          content: `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
          <div style="margin:50px auto;width:70%;padding:20px 0">
            <div style="border-bottom:1px solid #eee">
              <a href="" style="font-size:1.4em;color: #ec3531;text-decoration:none;font-weight:600">Trace inc</a>
            </div>
            <p style="font-size:1.1em">Hi,</p>
            <p>Thank you for choosing Trace inc. Use the following OTP to complete your Order procedures. OTP is valid for before refresh the page</p>
            <h2 style="background: #ec3531;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 1px;">${otp}</h2>
            <p style="font-size:0.9em;">Regards,<br />Trace inc</p>
            <hr style="border:none;border-top:1px solid #eee" />
            <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
              <p>Trace inc</p>
              <p>Kolathur po 679338, Kerala 679338</p>
              <p>India</p>
            </div>
          </div>
        </div>`
        }
        await sendMail(message)
        res.render('admin/accept', { title: 'Placing order', userData: user, onetp: otp, description: 'Placing order', hideHead: true, order: req.params.orderId, style: 'otp' })
      })
    })
  }
})
router.post('/admin/accept', verifyLogin, verifyAdmin, async (req, res, next) => {
  if (req.body.onetp == req.body.otp) {
    productData.getUserOrders(req.body.orderId).then(async (orderData) => {
      userData.doFind(orderData[0].userId).then(async (userData) => {
        let order = {};
        let username = userData.user.username.charAt(0).toUpperCase() + userData.user.username.slice(1);
        for (let i = 0; i < orderData.length; i++) {
          if (orderData[i]._id == req.body.orderId) {
            order = orderData[i]
          }
        }
        productData.succesOrder(order).then(async (response) => {
          let message = {
            email: userData.user.email,
            title: 'Your order was placed',
            text: 'Dear ' + userData.user.username + '.',
            //content: `<h2>Your order placed succesfull.</h2><p>Dear <span style='color: green;'>${username}</span>, Your order placed succesfull. <br> <span style="color: orange;">Orer id: ${order._id}</span></p>`
            content: `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
            <div style="margin:50px auto;width:70%;padding:20px 0">
                <div style="border-bottom:1px solid #eee">
                    <a href="" style="font-size:1.4em;color: #ec3531;text-decoration:none;font-weight:600">Trace inc</a>
                </div>
                <p style="font-size:1.1em">Hi,</p>
                <p>Thank you for choosing Trace inc. Dear ${username}. Your order was succesfully placed in your hand</p>
                <p>Order id: <span style="color:#ec3531">${order._id}</span></p>
                <p style="font-size:0.9em;">Regards,<br />Trace inc</p>
                <hr style="border:none;border-top:1px solid #eee" />
                <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
                    <p>Trace inc</p>
                    <p>Kolathur po 679338, Kerala 679338</p>
                    <p>India</p>
                </div>
            </div>
        </div>`
          }
          await sendMail(message)
          res.redirect('/user/orders')
        })
      })
    })
  } else {
    res.redirect('/user/orders')
  }
})
//SEARCH
router.post('/search', verifyLogin, async (req, res, next) => {
  productData.searchProduct(req.body.q).then((result) => {
    productData.getCartItems(req.session.user._id).then((notcount) => {
      for (let i = 0; i < result.length; i++) {
        result[i].title = result[i].title.slice(0, 10) + '...';
        result[i].description = result[i].description.slice(0, 20) + '...';
      }
      res.render('user/products', { title: 'Search ' + req.body.q, description: 'Search ' + req.body.q, user: req.session.user, products: result, style: 'products', notcount, script: 'products', login: req.session.login });
    })
  })
})
//ADMIN
router.get('/add', verifyLogin, verifyAdmin, (req, res, next) => {
  productData.getCartItems(req.session.user._id).then((notcount) => {
    res.render('admin/addprod', { title: 'Add a new product ', description: 'Add a new product ', hideHead: true, user: req.session.user, style: 'addform', notcount, login: req.session.login });
  })
})
router.post('/add', verifyLogin, verifyAdmin, (req, res, next) => {
  productData.addProduct(req.body, (id) => {
    req.files.thumbnail.mv('./public/images/products/' + id + '.jpeg', (err, done) => {
      if (!err) {
        res.redirect('/');
      } else {
        res.redirect('/add');
      }
    });
  })
})
router.get('/products', verifyLogin, verifyAdmin, (req, res, next) => {
  productData.getCartItems(req.session.user._id).then((notcount) => {
    productData.getAllProducts().then((products) => {
      for (let i = 0; i < products.length; i++) {
        products[i].title = products[i].title.slice(0, 10) + '...';
        products[i].description = products[i].description.slice(0, 20) + '...';
      }
      res.render('admin/products', { title: 'Products ', description: 'Manage products ', user: req.session.user, style: 'products', products, notcount, login: req.session.login });
    })
  })
})
router.get('/remove/:prodId', verifyLogin, verifyAdmin, (req, res, next) => {
  if (req.params.prodId) {
    productData.delProd(req.params.prodId).then((status) => {
      if (status) {
        res.redirect('/products')
      } else {
        res.redirect('/products')
      }
    })
  }
})
router.get('/edit/:prodId', verifyLogin, verifyAdmin, (req, res, next) => {
  if (req.params.prodId) {
    productData.findProduct(req.params.prodId).then((response) => {
      if (response) {
        console.log(response)
        response.price = parseInt(response.price)
        if (response.oldPrice) {
          response.oldPrice = parseInt(response.oldPrice)
        }
        if (response.charge) {
          response.charge = parseInt(response.charge)
        }
        res.render('admin/addprod', { title: response.title + ' - Basket', description: response.title + ' updating product - Basket', hideHead: true, update: true, product: response, user: req.session.user, login: req.session.login });
      } else {
        res.redirect('/');
      }
    });
  }
})
router.post('/update/:prodId', verifyLogin, (req, res, next) => {
  productData.editProd(req.params.prodId, req.body).then((response) => {
    if (response) {
      if (!req.files) {
        res.redirect('/')
      } else {
        let thumbnail = req.files.thumbnail;
        thumbnail.mv('./public/images/products/' + req.params.prodId + '.jpeg');
        res.redirect('/products');
      }
    }
  });
})
router.get('/user/orders', verifyLogin, verifyAdmin, (req, res, next) => {
  productData.getCartItems(req.session.user._id).then((notcount) => {
    productData.getAllOrders().then((products) => {
      let data = products;
      res.render('admin/orders', { title: 'Tottal orders ', description: 'Manage orders ', user: req.session.user, style: 'cart', data, notcount, login: req.session.login });
    })
  })
})
//LOGIN
router.get('/login', (req, res, next) => {
  if (req.session.login) {
    user = req.session.user;
    res.redirect('/');
  } else {
    user = false;
    res.render('user/login', { title: 'LogIn', description: 'Login with your existing accound', user: req.session.user, style: 'login', script: 'login', hideHead: true, login: req.session.login })
  }
});
router.post('/login', (req, res, next) => {
  userData.findUser(req.body).then((response) => {
    req.session.user = response.user;
    req.session.login = true;
    user = req.session.user;
    res.redirect('/');
  }).catch((err) => {
    req.session.login = false;
    user = false
    res.redirect('/login');
  });
});
//SIGNUP
router.get('/signup', (req, res, next) => {
  if (req.session.login) {
    user = req.session.user;
    res.redirect('/');
  } else {
    user = false;
    res.render('user/signup', { title: 'SignUp', description: 'Create a new account', user: req.session.user, style: 'login', script: 'login', hideHead: true })
  }
});
router.post('/signup', async (req, res, next) => {
  if (req.body.password > 6) {
    userData.createUser(req.body).then((response) => {
      req.session.user = response;
      req.session.login = true;
      user = req.session.user;
      res.redirect('/')
    }).catch((err) => {
      req.session.login = false;
      user = false;
      res.redirect('/signup');
    });
  } else {
    user = false;
    res.redirect('/signup')
  }
})
//LOGOUT
router.get('/logout', verifyLogin, (req, res, next) => {
  req.session.user = {}
  req.session.login = false;
  user = false;
  res.redirect('/login')
})
module.exports = router;
