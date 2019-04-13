const amazon = require('./amazon');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const Product = require('./models/product');
const bodyParser = require('body-parser');
const _ = require('lodash');
const nodemailer =  require('nodemailer');
const expressValidator = require('express-validator');
const session = require('express-session');



//Connect mongoDB
mongoose.connect('mongodb://localhost/amazon')
  .then(() => console.log('Connected to MongoDB...'))
  .catch(() => console.error('Could not connected MongoDB...', err));
  
//Init App
const app = express();

//Middleware
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));
// parse application/json
app.use(bodyParser.json());

//Public Folder 
app.use(express.static(path.join(__dirname,'/public')));

//Express Session MiddleWare
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true,
  cookie: { secure: true }
}));

//Express Messages MiddleWare
app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

//Express Validator MiddleWare
app.use(expressValidator());

//Load View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');


//Home Route
app.get('/', (req, res) => {
  Product.find({}, (err, products) => {
    if (err) {
      console.log(err)
    } else {
      res.render('index', {
        title: 'List of Product',
        products: products
      })
    }
  })

});

//Get Single Product
app.get('/product/:asin', (req, res) => {
  const asin = req.params.asin;
  Product.findOne({asin}, (err, product) => {
    res.render('edit_product',{
      product: product
    })
  });
});


//get Route
app.get('/products/get', (req, res) => {
  res.render('get', {
    title: 'Get Product'
  });
});

//Add submit Post Route
app.post('/products/get', (req, res) => {
  let asin = req.body.asin;
  req.checkBody('asin','Asin is required').notEmpty();

  let errors = req.validationErrors();
  if(errors){
    res.render('get',{
      title: 'Get Product',
      errors: errors
    });
  } else{
    Product.findOne({asin}, (err, product) => {
      if (err) {
        console.log('The search errored');
      } else if (_.isEmpty(product)) {
        (async () => {
          await amazon.Initial();
          let details = await amazon.getProductDetails(asin);
          let description = await amazon.getProductDescription(asin);
          let product = new Product();
          product.asin = req.body.asin;
          product.price = details.price;
          product.seller = details.seller;
          product.status = details.status;
          product.image = details.img;
          product.save((err) => {
            if (err) {
              console.log(err);
              return;
            } else {
              req.flash('success','Get Product Success');
              res.render('description',{
                title: 'Product Description',
                product: product,
                details: description,
                img: product.image
              });
            }
          });
          await amazon.end();
        })();
      } else {
        req.flash('success','Product have been already added');
        res.render('edit_product',{
          product: product
        })
      };
    });
  };
});

//Edit submit post Route
app.post('/product/:asin', (req, res) =>{
  Product.updateOne({asin: req.params.asin}, {
    $set:{
      price: req.body.price,
      status: req.body.status
    }
  },(err) => {
    if(err) {
      console.log(err);
      return;
    } else{
      res.redirect('/');
    }
  });
});
//Delete Product
app.delete('/product/:asin',(req, res) => {
  Product.deleteOne({asin: req.params.asin}, (err) => {
    if(err){
      console.log(err);
    }
    res.send('Sucess');
  });
});

//Check price Func
async function checkPrice() {
  const products =  await Product
    .find()
    .select({asin: 1, status:1, price: 1});
  let i;
  await amazon.Initial();
  for (i = 0; i < products.length; i++) {
    console.log('Check ASIN: ',products[i].asin);
    const cproduct = await amazon.getProductDetails(products[i].asin);
    if (products[i].status == cproduct.status ){
      if(products[i].price < cproduct.price){
        sendEmail('SẢN PHẨM TĂNG GIÁ', products[i].price,cproduct.price,products[i].asin);
      } else if(products[i].price > cproduct.price){
        sendEmail('SẢN PHẨM GIẢM GIÁ', products[i].price,cproduct.price,products[i].asin);
      }
    } else {
      sendEmail('SẢN PHẨM HẾT HÀNG', products[i].price,cproduct.status,products[i].asin);
    };
  };
  await amazon.end();
  console.log('Update Complete');
};

//Send Email Func
function sendEmail(subject, price, cprice, asin)
{
    var transporter = nodemailer.createTransport({
        service : 'gmail',
        auth: {
            user : 'd.huyb94@gmail.com',
            pass : 'chinchopa94'
        }
    });
    var mailOptions= {
        from : 'd.huyb94@gmail.com',
        to: 'd.huyb94@gmail.com',
        subject : subject,
        text : `ASIN: ${asin }, Giá cũ: ${price}, Giá mới: ${cprice}
        Link san pham: https://www.amazon.com/dp/${asin }`
    }
    transporter.sendMail(mailOptions, function(err, info){
        if(err)
        {
            console.log('Lỗi khi gửi mail: ', err);
        }
        else
        {
            console.log('Đã gửi email: ', info.response);
        }
    });
};

//Set Time Check Price
var timer = setInterval(function() {
    return checkPrice();
}, 1800000);
//Server
app.listen(3000, () => {
  console.log('Server started on port 3000....');
});