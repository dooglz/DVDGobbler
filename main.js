
function Startup() {
    $("#zapcookies").click(() => {
        $.get("./zapCookies", (data) => {
            $("#zapcookspan").text(data);
        });
    });
    $("#sheetbtn").click(() => {
        $.get("./gsheets");
    });

    $("#addBtn").click(() => {
        let tr = $("<tr></tr>");
        let ipt = $('<input type="text" name="barcode" value=7321900180207>"');
        tr.append($('<td>').append(ipt));

        let ZAP_ID = $('<span>');
        tr.append($('<td>').append(ZAP_ID));
        let ZAP_Price = $('<span>');
        tr.append($('<td>').append(ZAP_Price));
        let MAG_ID = $('<span>');
        tr.append($('<td>').append(MAG_ID));
        let MAG_Price = $('<span>');
        tr.append($('<td>').append(MAG_Price));
        let CEX_ID = $('<span>');
        tr.append($('<td>').append(CEX_ID));
        let CEX_Price = $('<span>');
        tr.append($('<td>').append(CEX_Price));
        let ZIF_ID = $('<span>');
        tr.append($('<td>').append(ZIF_ID));
        let ZIF_Price = $('<span>');
        tr.append($('<td>').append(ZIF_Price));
        let MOM_ID = $('<span>');
        tr.append($('<td>').append(MOM_ID));
        let MOM_Price = $('<span>');
        tr.append($('<td>').append(MOM_Price));

        let ZAPBtn = $('<button type="button" id="addBtn1">ZAP</button>');
        ZAPBtn.click(() => {
            console.log("yo:", ipt.val());
            ZAPBtn.attr("disabled", true);
            zapReq(ipt.val(), (res) => {
                ZAPBtn.attr("disabled", false);
                if (res.error) {
                    ZAP_ID.text("error");
                    ZAP_Price.text("error");
                } else {
                    ZAP_ID.text(res.title + " " + res.type);
                    ZAP_Price.text(res.price);
                }
            });
        });
        let MAGBtn = $('<button type="button" id="addBtn2">MAG</button>');
        MAGBtn.click(() => {
            console.log("yo:", ipt.val());
            MAGBtn.attr("disabled", true);
            magReq(ipt.val(), (res) => {
                MAGBtn.attr("disabled", false);
                if (res.error) {
                    MAG_ID.text("error");
                    MAG_Price.text("error");
                } else {
                    MAG_ID.text(res.title);
                    MAG_Price.text(res.price);
                }
            });
        });
        let CEXBtn = $('<button type="button" id="addBtn2">CEX</button>');
        CEXBtn.click(() => {
            console.log("yo:", ipt.val());
            CEXBtn.attr("disabled", true);
            cexReq(ipt.val(), (res) => {
                CEXBtn.attr("disabled", false);
                if (res.error) {
                    CEX_ID.text("error");
                    CEX_Price.text("error");
                } else {
                    CEX_ID.text(res.title);
                    CEX_Price.text(res.price + " ex:" + res.priceEX);
                }
            });
        });

        let ZIFBtn = $('<button type="button" id="addBtn2">ZIF</button>');
        ZIFBtn.click(() => {
            console.log("yo:", ipt.val());
            ZIFBtn.attr("disabled", true);
            zifReq(ipt.val(), (res) => {
                ZIFBtn.attr("disabled", false);
                if (res.error) {
                    ZIF_ID.text("error");
                    ZIF_Price.text("error");
                } else {
                    ZIF_ID.text(res.title);
                    ZIF_Price.text(res.price);
                }
            });
        });
        let MOMBtn = $('<button type="button" id="addBtn2">MOM</button>');
        MOMBtn.click(() => {
            console.log("yo:", ipt.val());
            MOMBtn.attr("disabled", true);
            momReq(ipt.val(), (res) => {
                MOMBtn.attr("disabled", false);
                if (res.error) {
                    MOM_ID.text("error");
                    MOM_Price.text("error");
                } else {
                    MOM_ID.text(res.title);
                    MOM_Price.text(res.price);
                }
            });
        });
        let Buttons = $('<td>');
        Buttons.append(ZAPBtn);
        Buttons.append(MAGBtn);
        Buttons.append(CEXBtn);
        Buttons.append(ZIFBtn);
        Buttons.append(MOMBtn);
        tr.append(Buttons);
        $('#maintable tr:last').after(tr);
    });
}

function Req(endpoint, barcode, handler) {
    var settings = {
        "async": true,
        "crossDomain": true,
        "url": endpoint,
        "method": "GET",
        "data": "barcode=" + barcode
    };

    $.ajax(settings).done(function (response) {
        console.log(response);
        handler(response);
    });
}

function zapReq(barcode, handler) {
    return Req("/zap", barcode, handler);
}
function magReq(barcode, handler) {
    return Req("/mag", barcode, handler);
}
function cexReq(barcode, handler) {
    return Req("/cex", barcode, handler);
}
function zifReq(barcode, handler) {
    return Req("/zif", barcode, handler);
}
function momReq(barcode, handler) {
    return Req("/mom", barcode, handler);
}
$(document).ready(Startup());
