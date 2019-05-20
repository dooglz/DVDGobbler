const express = require('express');
var http = require("https");
var request = require("request");
const app = express();
const puppeteer = require('puppeteer');
const port = 3000;
const fs = require('fs');

let creds = false;
function getGCreds() {
    fs.readFile('./credentials.json', (err, content) => {
        if (err) {
            console.error('Error loading client secret file:', err);
            return;
        }
        creds = JSON.parse(content);
        console.log('Creds loaded from file', creds.project_id);
    });
}
getGCreds();


app.use("/", express.static(__dirname));

app.get('/zapCookies', function (req, res) {
    newZapCookie((c) => { res.send(c); });
});
app.get('/gsheets', function (req, res) {
    ReadFromGSheet();
    res.send("OK");
});

let zapcookies = "";

app.get('/zap', function (req, res) {
    if (zapcookies === "") { newZapCookie(); }
    if (req && req.query && req.query.barcode) {
        zap(req.query.barcode, (r) => { res.send(r); })
    } else {
        res.send({ error: true });
    }
})

app.get('/mag', function (req, res) {
    if (req && req.query && req.query.barcode) {
        magpie(req.query.barcode, (r) => { res.send(r); });
    } else {
        res.send({ error: true });
    }
})

app.get('/cex', function (req, res) {
    if (req && req.query && req.query.barcode) {
        cex(req.query.barcode, (r) => { res.send(r); });
    } else {
        res.send({ error: true });
    }
})


app.get('/zif', function (req, res) {
    if (req && req.query && req.query.barcode) {
        ziffit(req.query.barcode, (r) => { res.send(r); });
    } else {
        res.send({ error: true });
    }
})

app.get('/mom', function (req, res) {
    if (req && req.query && req.query.barcode) {
        mom(req.query.barcode, (r) => { res.send(r); });
    } else {
        res.send({ error: true });
    }
})


function newZapCookie(cb) {
    console.log("Getting New zap cookies");
    request('https://zapper.co.uk/', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            zapcookies = response.headers['set-cookie'];
            let str = response.headers['set-cookie'].join(" ");
            let sessid = str.match(/(PHPSESSID=\w+);/gm);
            let zap_dr = str.match(/(zap_dr=\w+);/gm);
            zapcookies = sessid[0] + zap_dr[0];
            console.log("ZapCookies: ", zapcookies);
            if (cb) { cb(zapcookies); }
        } else {
            console.error("WOMP")
        }
    });
}

function zap(barcode, callback, guard) {
    console.log("Zapping", barcode)
    let cooks = zapcookies;
    var options = {
        method: 'POST',
        url: 'https://zapper.co.uk/ZapResponder',
        gzip: true,
        headers:
        {
            'cache-control': 'no-cache',
            Connection: 'keep-alive',
            Host: 'zapper.co.uk',
            'Cache-Control': 'no-cache',
            dnt: '1',
            'x-requested-with': 'XMLHttpRequest',
            authority: 'zapper.co.uk',
            referer: 'https://zapper.co.uk/my-list',
            accept: 'text/plain, */*; q=0.01',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36',
            'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
            'accept-encoding': 'gzip, deflate, br',
            origin: 'https://zapper.co.uk',
            cookie: cooks
        },
        body: 'action=AddItemToActiveList&identifier=' + barcode + '&content=my-list'
    };

    request(options, function (error, response, body) {
        if (error) {
            console.error("ZAP ERROR", error);
            callback({ error: true });
            return;
        }
        console.log(body);
        let ser = {};
        try {
            ser = JSON.parse(body);
        } catch (e) {
            console.error("Zap result, non json!");
            return;
        }
        if (ser.ValuationDisplayMessage !== "Added to list" && guard === undefined) {
            console.info("Assuming Garbage Result, going again");
            zap(barcode, callback, true);
            return;
        }
        if (ser.Offer <= 0) { ser.Offer = 0; }
        if (ser.Title == "") { ser.Title = "NOSALE"; }
        let obj = { price: ser.Offer, type: ser.Media, title: ser.Title }
        callback(obj);
    });
}

let cexbrowserlock = false;
function cex(barcode, callback) {
    if (cexbrowserlock) {
        //really really bad spinlock
        setTimeout(cex, 1000, barcode, callback);
        return;
    }
    cexbrowserlock = true;
    console.log("cex-ing ", '(' + barcode + ')');
    let scrape = async () => {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://uk.webuy.com/product-detail/?id=' + barcode);
        await page.waitForSelector('.productNamecustm, #showmoreresult');
        //page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        //await page.waitForNavigation({ waitUntil: 'domcontentloaded' })
        await page.waitFor(200);
        try {
            //productNamecustm could wipe at any time, even inbetween calls, hence trycatch
            const hasname = await page.evaluate(() => document.querySelector(".productNamecustm"));
            const text = await page.evaluate(() => document.querySelector(".productNamecustm").innerText);
            //wait for the name to be "something"
            await page.waitForFunction('document.querySelector(".productNamecustm").innerText != ""');
            // await page.waitForFunction('document.querySelector(".productNamecustm").innerText != "\n"');   
            //get name, 
            const itemname = await page.evaluate(() => document.querySelector(".productNamecustm").innerText);

            //check if blank, if so we're about to be bumped to homepage
            const text2filtered = itemname.replace(/(\r\n|\n|\r|\s{2,})/gm, "");
            if (text2filtered === "") {
                await browser.close();
                return { title: "NOSALE", price: 0, priceEX: 0 };
            }
        } catch (e) {
            await browser.close();
            return { title: "NOSALE", price: 0, priceEX: 0 };
        }
        //const text3 = await page.evaluate(() => document.querySelector("#showmoreresult"));
        //const text4 = await page.evaluate(() => window.location.href);
        const result = await page.evaluate(() => {
            let priceEX = document.querySelector('#Aexchprice');
            let title = document.querySelector('.productNamecustm');
            let price = document.querySelector('#Acashprice');
            if (title == null) {
                return { title: "NOSALE", price: 0, priceEX: 0 };
            }
            return {
                title: title.firstChild.nodeValue.replace(/(\r\n|\n|\r)/gm, "").replace(/\s\s+/g, ' '),
                price: price.innerText,
                priceEX: priceEX.innerText
            }
        });
        await browser.close();
        return result;
    };

    scrape().then(
        (value) => {
            console.log(value);
            cexbrowserlock = false;
            callback(value);
        },
        (err) => {
            console.error(err);
            cexbrowserlock = false;
            callback({ error: true })
        }
    );
}

let mombrowserlock = false;
function mom(barcode, callback) {
    if (mombrowserlock) {
        //really really bad spinlock
        setTimeout(mom, 1000, barcode, callback);
        return;
    }
    mombrowserlock = true;
    console.log("mom-ing ", barcode);
    let scrape = async () => {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://www.momox.co.uk/offer/' + barcode);
        await page.waitForSelector('.searchresult-price, .icon-not-found, #noOfferReasonLink');
        const result = await page.evaluate(() => {
            let title = document.querySelector('.offer-page-searchresult > div > div > div.product-title > h1');
            let price = document.querySelector('.searchresult-price');
            if (price == null || title == null) {
                return { title: "NOSALE", price: 0 };
            }
            return {
                title: title.innerText.replace(/(\r\n|\n|\r)/gm, ""),
                price: price.innerText,
            }
        });
        await browser.close();
        return result;
    };

    scrape().then(
        (value) => {
            console.log(value);
            mombrowserlock = false;
            callback(value);
        },
        (err) => {
            console.error(err);
            mombrowserlock = false;
            callback({ error: true })
        }
    );
}



let ziffitbrowserlock = false;
function ziffit(barcode, callback) {
    if (ziffitbrowserlock) {
        //really really bad spinlock
        setTimeout(ziffit, 1000, barcode, callback);
        return;
    }
    ziffitbrowserlock = true;
    console.log("ziffit-ing ", barcode);
    let scrape = async () => {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://www.ziffit.com/en-gb/basket');
        const seltag = '#basket-page-component > div > div.col-md-12.barcode > div > form > div.col-sm-offset-3.col-sm-6 > input';
        await page.waitFor(seltag);
        await page.type(seltag, barcode);
        await (await page.$(seltag)).press('Enter');
        console.info("Entered Barcode");
        await page.waitForSelector('#basket-page-component > div > div.col-md-9.tableholder > table > tbody > tr, .alert-danger');
        const result = await page.evaluate(() => {
            let title = document.querySelector('#basket-page-component > div > div.col-md-9.tableholder > table > tbody > tr > th:nth-child(1)');
            let price = document.querySelector('#basket-page-component > div > div.col-md-9.tableholder > table > tbody > tr > th:nth-child(4)');
            if (title == null) {
                return { title: "NOSALE", price: 0 };
            }
            return {
                title: title.innerText,
                price: price.innerText
            }
        });
        await browser.close();
        return result;
    };

    scrape().then(
        (value) => {
            console.log(value);
            ziffitbrowserlock = false;
            callback(value);
        },
        (err) => {
            console.error(err);
            ziffitbrowserlock = false;
            callback({ error: true })
        }
    );
}


let magbrowserlock = false;
function magpie(barcode, callback) {
    if (magbrowserlock) {
        //really really bad spinlock
        setTimeout(magpie, 1000, barcode, callback);
        return;
    }
    magbrowserlock = true;
    console.log("magpie-ing ", barcode);
    let scrape = async () => {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://www.musicmagpie.co.uk/start-selling/basket-media/');
        await page.waitFor('#txtBarcode');
        await page.type('#txtBarcode', barcode);
        await (await page.$('#getValSmall')).press('Enter');
        console.info("Entered Barcode");
        await page.waitForNavigation();
        await page.waitForSelector('#basketareaWrapper > div > div.left > div.row.rowDetails_Media, #lblMessage1');
        const result = await page.evaluate(() => {
            let title = document.querySelector('#basketareaWrapper > div > div.left > div.row.rowDetails_Media > div.col_Title');
            let price = document.querySelector('#basketareaWrapper > div > div.left > div.row.rowDetails_Media > div.col_Price');
            if (title == null) {
                return { title: "NOSALE", price: 0 };
            }
            return {
                title: title.innerText,
                price: price.innerText
            }
        });
        await browser.close();
        return result;
    };

    scrape().then(
        (value) => {
            console.log(value);
            magbrowserlock = false;
            callback(value);
        },
        (err) => {
            console.error(err);
            magbrowserlock = false;
            callback({ error: true })
        }
    );
}


function ReadFromGSheet() {
    if (!creds) { return; }
    const GoogleSpreadsheet = require('google-spreadsheet');
    console.log("Attempting to open Gsheet");
    // Create a document object using the ID of the spreadsheet - obtained from its URL.
    const doc = new GoogleSpreadsheet('1EUJp4EwW3FQ6_vPHtmiR4v6wtNS-vtYP7y46LZyQUak');
    console.log("Attempting to Auth");
    // Authenticate with the Google Spreadsheets API.
    doc.useServiceAccountAuth(creds, function (err) {
        if (err) {
            console.error("GAuth Error"), err;
            return;
        }
        // Get all of the rows from the spreadsheet.
        doc.getRows(1, function (err, rows) {
            if (err) {
                console.error("getRows Error"), err;
                return;
            }
            console.info("Found rows:", rows.length);
            rows.forEach((r, i) => {
                if (r.barcode && r.musicmagpieid === "" && r.musicmagpieprice === "") {
                    console.info("Auto Magpie-ing ", r.item, i);
                    magpie(r.barcode, (o) => {
                        if (!o.error) {
                            r.musicmagpieid = o.title;
                            r.musicmagpieprice = o.price;
                            r.save();
                        }
                    });
                }/*
                if (r.barcode && r.zapperid === "" && r.zapperprice === "") {
                    console.info("Auto Zap-ing ", r.item, i);
                    zap(r.barcode, (o) => {
                        if (!o.error) {
                            r.zapperid = o.title;
                            r.zapperprice = o.price;
                            r.save();
                        }
                    });
                }*/
                if (r.barcode && r.cexid === "" && r.cexprice === "") {
                    console.info("Auto Cex-ing ", r.item, i);
                    cex(r.barcode, (o) => {
                        if (!o.error) {
                            r.cexid = o.title;
                            r.cexprice = o.price;
                            r.cexpricevoucher = o.priceEX;
                            r.save();
                        }
                    });
                }
                if (r.barcode && r.ziffitid === "" && r.ziffitprice === "") {
                    console.info("Auto ZIF-ing ", r.item, i);
                    ziffit(r.barcode, (o) => {
                        if (!o.error) {
                            r.ziffitid = o.title;
                            r.ziffitprice = o.price;
                            r.save();
                        }
                    });
                }
                if (r.barcode && r.momoxid === "" && r.momoxprice === "") {
                    console.info("Auto MOM-ing ", r.item, i);
                    mom(r.barcode, (o) => {
                        if (!o.error) {
                            r.momoxid = o.title;
                            r.momoxprice = o.price;
                            r.save();
                        }
                    });
                }
            });
        });
    });
}

app.listen(port, () => console.log(`Example app listening on port ${port}!`))



