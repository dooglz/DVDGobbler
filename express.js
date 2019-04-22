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
        let ser = JSON.parse(body);
        if (ser.ValuationDisplayMessage !== "Added to list" && guard === undefined) {
            console.info("Assuming Garbage Result, going again");
            zap(barcode, callback, true);
            return;
        }
        let obj = { price: ser.Offer, type: ser.Media, title: ser.Title }
        callback(obj);
    });
}


function magpie(barcode, callback) {
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
        await page.waitForSelector('#basketareaWrapper > div > div.left > div.row.rowDetails_Media');
        const result = await page.evaluate(() => {
            let title = document.querySelector('#basketareaWrapper > div > div.left > div.row.rowDetails_Media > div.col_Title').innerText;
            let price = document.querySelector('#basketareaWrapper > div > div.left > div.row.rowDetails_Media > div.col_Price').innerText;
            return {
                title: title,
                price: price
            }
        });
        await browser.close();
        return result;
    };

    scrape().then(
        (value) => {
            console.log(value);
            callback(value);
        },
        (err) => {
            console.error(err);
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
                }
                if (r.barcode && r.zapperid === "" && r.zapperprice === "") {
                    console.info("Auto Zap-ing ", r.item, i);
                    zap(r.barcode, (o) => {
                        if (!o.error) {
                            r.zapperid = o.title;
                            r.zapperprice = o.price;
                            r.save();
                        }
                    });
                }
            });
        });
    });
}

app.listen(port, () => console.log(`Example app listening on port ${port}!`))



