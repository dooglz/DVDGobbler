const express = require('express');
var http = require("https");
var request = require("request");
const app = express();
const port = 3000;

app.use("/", express.static(__dirname));

app.get('/zapCookies', function (req, res) {
    newZapCookie();
    res.send('ok');
});


app.get('/zap', function (req, res) {
    if (req && req.query && req.query.barcode) {
        zap(req.query.barcode, (r) => { res.send(r); })
    } else {
        res.send('ERR')
    }
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))


newZapCookie();
let zapcookies = "";

function newZapCookie() {
    console.log("Getting New zap cookies");
    request('https://zapper.co.uk/', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            zapcookies = response.headers['set-cookie'];
            let str = response.headers['set-cookie'].join(" ");
            let sessid = str.match(/(PHPSESSID=\w+);/gm);
            let zap_dr = str.match(/(zap_dr=\w+);/gm);
            zapcookies = sessid[0] + zap_dr[0];
            console.log("ZapCookies: ", zapcookies);
        } else {
            console.error("WOMP")
        }
    });
}

function zap(barcode, callback,guard) {
    console.log("Zapping ", barcode)
    let cooks = zapcookies;
    var options = {
        method: 'POST',
        url: 'https://zapper.co.uk/ZapResponder',
        gzip: true,
        headers:
        {
            'cache-control': 'no-cache',
            Connection: 'keep-alive',
            'content-length': '67',
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
        if (error) throw new Error(error);
        console.log(body);
        let ser = JSON.parse(body);
        if(ser.ValuationDisplayMessage!=="Added to list" && guard === undefined){
            console.info("Assuming Garbage Result, going again");
            zap(barcode, callback, true);
            return;
        }
        let obj = { price: ser.Offer, type: ser.Media, title: ser.Title }
        callback(obj);
    });
}