const puppeteer = require('puppeteer');
const download = require('image-downloader');
const fs = require('fs');


let browser = null;
let page = null;
const baseURL = (asin) => `https://www.amazon.com/dp/${asin}`;

const amazon = {

  Initial: async() => {
    //Launch Puppeteer
  browser = await puppeteer.launch({
    headless: true
  });
  page = await browser.newPage();

   //khong load img, css, fond
   await page.setRequestInterception(true);
   page.on('request', (request) => {
     if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet' || request.resourceType() === 'font') {
       request.abort();
     } else {
       request.continue();
     }
   });

   //Set Cookies
   let cookiesArr =  [
    {
        "domain": ".amazon.com",
        "expirationDate": 2082787201.359146,
        "hostOnly": false,
        "httpOnly": false,
        "name": "i18n-prefs",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": false,
        "session": false,
        "storeId": "0",
        "value": "USD",
        "id": 1
    },
    {
        "domain": ".amazon.com",
        "expirationDate": 2082787200.929333,
        "hostOnly": false,
        "httpOnly": false,
        "name": "session-id",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": false,
        "session": false,
        "storeId": "0",
        "value": "144-4073134-0536961",
        "id": 2
    },
    {
        "domain": ".amazon.com",
        "expirationDate": 2082787200.929288,
        "hostOnly": false,
        "httpOnly": false,
        "name": "session-id-time",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": false,
        "session": false,
        "storeId": "0",
        "value": "2082787201l",
        "id": 3
    },
    {
        "domain": ".amazon.com",
        "expirationDate": 2185498193.413453,
        "hostOnly": false,
        "httpOnly": false,
        "name": "session-token",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": false,
        "session": false,
        "storeId": "0",
        "value": "Fx6hf/I8uTx4YN4DyGl4Ymp1zW9vHxB4OqzqSSKZX2iFUjh7xiQ1IsI291KmsMcXEQQZEljh7Xe5ipk1w/ZTEqERv5Y0T9ZpE7TqoL9gFRhHL6ZewzeJk3tf977B5YQii518cD+9jODyrXHo6iXpr9sOVkqUXFo1iRXXmDtnh6osA0aPTa953ugK/G6K/KfB1FpZOMi2uvxTSJpCzYodSw6BhO7istN3bsMl8UdRm06lwQH/TLJEV9XJky2Z1na7qtM9Vbu2y8BNb55GiqAisA==",
        "id": 4
    },
    {
        "domain": ".amazon.com",
        "expirationDate": 2082787200.929225,
        "hostOnly": false,
        "httpOnly": false,
        "name": "ubid-main",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": false,
        "session": false,
        "storeId": "0",
        "value": "132-0890182-3045412",
        "id": 5
    },
    {
        "domain": ".amazon.com",
        "expirationDate": 2082787201.359079,
        "hostOnly": false,
        "httpOnly": false,
        "name": "x-main",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": false,
        "session": false,
        "storeId": "0",
        "value": "\"kLq2@nbkFvgYmW5AgkIvYp8iJNaNkSMCZvkKq3Pi4gxZUB5VFI4PkncZ35EXyEvH\"",
        "id": 6
    },
    {
        "domain": ".amazon.com",
        "expirationDate": 2082787201.461413,
        "hostOnly": false,
        "httpOnly": false,
        "name": "x-wl-uid",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": false,
        "session": false,
        "storeId": "0",
        "value": "1sc+T2vBUVT2WskxcBFhfwiC7usHYi5iyF8I8aBT47IvfU7VBS+AaHnY4Tsn7GWUT0kMoWd6vxLqG1iPqaPIUkw==",
        "id": 7
    },
    {
        "domain": "www.amazon.com",
        "expirationDate": 1615258203,
        "hostOnly": true,
        "httpOnly": false,
        "name": "csm-hit",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": false,
        "session": false,
        "storeId": "0",
        "value": "tb:s-FYYYV633T13AWEE5KGYF|1554778203093&t:1554778203093&adb:adblk_no",
        "id": 8
    }
    ];
     
   try {
     for (let cookie of cookiesArr) {
       await page.setCookie(cookie)
     };
     console.log('Session has been loaded in the browser'); 
   } catch (error) {
     console.log(error);
   }
  },

  getProductDetails: async (asin) => {
   // Toi trang san pham
   //CHECK URL
   const url = await page.url();
   if (url != baseURL(asin)) {
     await page.goto(baseURL(asin),{
      waitUntil: 'networkidle2',
      timeout: 3000000
     });
   };

    //Lay thong tin 
    const details = await page.evaluate((asin) => {
      const img = document.querySelector('#imgTagWrapperId > img').getAttribute('data-old-hires');
      const status = document.querySelector('#availability').innerText.trim();
      let price, seller;
      if (!status.includes('Available from these sellers.') && !status.includes('Currently unavailable.')) {
        price = /[^$]+/g.exec(document.querySelector('#priceblock_ourprice, #priceblock_dealprice, #priceblock_saleprice').innerText)[0];
        seller = document.querySelector('#merchant-info').innerText.trim();
      };

      return {
        price,
        status,
        seller,
        img,
        asin
      }
    },asin);

    return details;
  },

  getProductDescription: async (asin) => {
    //CHECK URL
    const url = await page.url();

    if (url != baseURL(asin)) {
      await page.goto(baseURL(asin),{
        waitUntil: 'networkidle2',
        timeout: 3000000
       });
    };
    
  //Lay thong tin 
    const moredetails = await page.evaluate(() => {
      let description = document.getElementById("productDescription");
      description = description != null ? description.innerHTML.trim() : description;
      const about = [];
      document.querySelectorAll('ul[class="a-unordered-list a-vertical a-spacing-none"] > li').forEach(li => {
        about.push(li.innerText);
      });

      return {
        description,
        about
      }
    });

    return moredetails;
  },

  
  end: async () => {
    await browser.close();
  }

};

module.exports = amazon;